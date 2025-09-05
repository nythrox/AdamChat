import { ConvexError, v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GenericQueryCtx } from "convex/server";
import { DataModel, Id } from "./_generated/dataModel";
import { crud } from "convex-helpers/server/crud";
import schema from "./schema";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getOwnProfile(ctx);
    const user = (await ctx.db.get(profile?.userId))!;

    return {
      user,
      profile,
    };
  },
});

export const getUserProfile = async (ctx: QueryCtx, userId: Id<"users">) => {
  const existingProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return existingProfile;
};

export const getOwnProfile = async (ctx: GenericQueryCtx<DataModel>) => {
  const userId = await guaranteeAuthUserId(ctx);
  return (await getUserProfile(ctx, userId))!;
};

export const guaranteeAuthUserId = async (ctx: GenericQueryCtx<DataModel>) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  return userId;
};

export const updateProfile = mutation({
  args: {
    displayName: v.string(),
    status: v.optional(v.string()),
    preferredLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);
    await ctx.db.patch(profile._id, {
      displayName: args.displayName,
      status: args.status,
      preferredLanguage: args.preferredLanguage,
    });
  },
});

export const updateOnlineStatus = mutation({
  args: {
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await getOwnProfile(ctx);

    await ctx.db.patch(profile._id, {
      isOnline: args.isOnline,
      lastSeen: Date.now(),
    });
  },
});

export const searchUsers = query({
  args: {
    identification: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await guaranteeAuthUserId(ctx);
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(
          q.eq(q.field("email"), args.identification),
          q.eq(q.field("phone"), args.identification)
        )
      )
      .collect();

    // Filter out current user and get profiles
    const profiles = await Promise.all(
      users
        .filter((user) => user._id !== userId)
        .map(async (user) => {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .unique();

          return profile!
        })
    );

    return profiles;
  },
});
