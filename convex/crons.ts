import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for expired payment requests every minute
crons.interval(
  "check-expired-payment-requests",
  { minutes: 1 },
  internal.paymentRequests.checkExpiredRequests
);

export default crons; 