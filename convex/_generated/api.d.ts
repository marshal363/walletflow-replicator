/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activityLogs from "../activityLogs.js";
import type * as contacts from "../contacts.js";
import type * as init from "../init.js";
import type * as insights from "../insights.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as paymentRequests from "../paymentRequests.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as wallets from "../wallets.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  contacts: typeof contacts;
  init: typeof init;
  insights: typeof insights;
  messages: typeof messages;
  notifications: typeof notifications;
  paymentRequests: typeof paymentRequests;
  transactions: typeof transactions;
  users: typeof users;
  wallets: typeof wallets;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
