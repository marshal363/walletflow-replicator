import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get payment requests for a user (either as requester or payer)
export const getPaymentRequests = query({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("requester"), v.literal("payer")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("expired"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    const field = args.role === "requester" ? "requesterId" : "payerId";
    let query = ctx.db
      .query("paymentRequests")
      .withIndex(`by_${args.role}`, (q) => q.eq(field, args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return await query.order("desc").collect();
  },
});

// Create a new payment request
export const createPaymentRequest = mutation({
  args: {
    requesterId: v.id("users"),
    payerId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    expiresAt: v.string(),
    metadata: v.optional(
      v.object({
        category: v.optional(v.string()),
        splitDetails: v.optional(
          v.array(
            v.object({
              userId: v.string(),
              amount: v.number(),
              status: v.union(v.literal("pending"), v.literal("paid")),
            })
          )
        ),
        recurringDetails: v.optional(
          v.object({
            frequency: v.string(),
            nextDueDate: v.string(),
            endDate: v.optional(v.string()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const request = await ctx.db.insert("paymentRequests", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Create a message for the payment request
    await ctx.db.insert("messages", {
      senderId: args.requesterId,
      receiverId: args.payerId,
      type: "payment_request",
      content: args.description,
      status: "sent",
      metadata: {
        paymentAmount: args.amount,
        paymentCurrency: args.currency,
        paymentStatus: "pending",
      },
      timestamp: now,
    });

    // Create a notification for the payer
    await ctx.db.insert("notifications", {
      userId: args.payerId,
      type: "payment_request",
      title: "New Payment Request",
      content: `You have a new payment request for ${args.amount} ${args.currency}`,
      status: "unread",
      metadata: {
        relatedId: request,
        priority: "high",
      },
      createdAt: now,
    });

    return request;
  },
});

// Update payment request status
export const updatePaymentRequestStatus = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    status: v.union(
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Payment request not found");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: now,
    });

    // Create a notification for the requester
    await ctx.db.insert("notifications", {
      userId: request.requesterId,
      type: "payment_request",
      title: "Payment Request Updated",
      content: `Your payment request has been ${args.status}`,
      status: "unread",
      metadata: {
        relatedId: args.requestId,
        priority: "medium",
      },
      createdAt: now,
    });

    return request;
  },
});

// Handle recurring payment requests
export const processRecurringPaymentRequests = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const requests = await ctx.db
      .query("paymentRequests")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.neq(q.field("metadata.recurringDetails"), undefined)
        )
      )
      .collect();

    const newRequests = [];
    for (const request of requests) {
      const recurringDetails = request.metadata?.recurringDetails;
      if (!recurringDetails) continue;

      const nextDueDate = new Date(recurringDetails.nextDueDate);
      if (nextDueDate <= now) {
        // Create new payment request
        const newRequest = await ctx.db.insert("paymentRequests", {
          requesterId: request.requesterId,
          payerId: request.payerId,
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          status: "pending",
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          metadata: {
            ...request.metadata,
            recurringDetails: {
              ...recurringDetails,
              nextDueDate: getNextDueDate(recurringDetails.frequency, nextDueDate).toISOString(),
            },
          },
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        newRequests.push(newRequest);
      }
    }
    return newRequests;
  },
});

// Helper function to calculate next due date based on frequency
function getNextDueDate(frequency: string, currentDate: Date): Date {
  const next = new Date(currentDate);
  switch (frequency.toLowerCase()) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      throw new Error("Invalid frequency");
  }
  return next;
} 