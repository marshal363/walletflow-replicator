import { query } from "./_generated/server";

export default query(async (ctx) => {
  const users = await ctx.db.query("users").collect();
  return users.map(user => ({
    id: user._id,
    clerkId: user.clerkId,
    name: user.name
  }));
}); 