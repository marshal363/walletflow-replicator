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
import type * as accounts from "../accounts.js";
import type * as activityLogs from "../activityLogs.js";
import type * as contacts from "../contacts.js";
import type * as conversations from "../conversations.js";
import type * as debug from "../debug.js";
import type * as getUserIds from "../getUserIds.js";
import type * as init from "../init.js";
import type * as insights from "../insights.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as paymentRequests from "../paymentRequests.js";
import type * as testing from "../testing.js";
import type * as transactions from "../transactions.js";
import type * as transfers from "../transfers.js";
import type * as users from "../users.js";
import type * as utils_walletHelpers from "../utils/walletHelpers.js";
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
  accounts: typeof accounts;
  activityLogs: typeof activityLogs;
  contacts: typeof contacts;
  conversations: typeof conversations;
  debug: typeof debug;
  getUserIds: typeof getUserIds;
  init: typeof init;
  insights: typeof insights;
  messages: typeof messages;
  migrations: typeof migrations;
  notifications: typeof notifications;
  paymentRequests: typeof paymentRequests;
  testing: typeof testing;
  transactions: typeof transactions;
  transfers: typeof transfers;
  users: typeof users;
  "utils/walletHelpers": typeof utils_walletHelpers;
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
