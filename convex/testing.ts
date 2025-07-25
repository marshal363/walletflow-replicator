import { query } from "./_generated/server";

export const listWallets = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("wallets").collect();
  },
}); 