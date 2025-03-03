import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for expired notifications every 15 seconds
crons.interval(
  "check-expired-notifications",
  { seconds: 15 },
  internal.notifications.checkExpiredNotificationsHandler
);

// Check for expired payment requests every hour
crons.interval(
  "check-expired-payment-requests",
  { hours: 1 },
  internal.paymentRequests.checkExpiredRequests
);

export default crons; 