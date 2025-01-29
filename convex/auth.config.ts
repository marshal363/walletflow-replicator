import { defineAuth } from "convex/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export default {
  providers: [
    {
      domain: "https://key-emu-56.clerk.accounts.dev",
      applicationID: "convex",
    },
  ]
}; 