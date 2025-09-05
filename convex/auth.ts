import {
  convexAuth,
  createAccount,
  getAuthUserId,
} from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Phone } from "@convex-dev/auth/providers/Phone";
import {
  action,
  internalAction,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { DataModel, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// const mockOTP = Phone({
//   id: "mock-otp",
//   maxAge: 60 * 20, // 20 minutes
//   async generateVerificationToken() {
//     return "000000";
//   },
//   async sendVerificationRequest({ identifier: phone, token }, ctx) {
//     if (phone === undefined) {
//       throw new Error("`phone` param is missing for mock-otp");
//     }
//   },
// });

const mockPhoneLogin = ConvexCredentials<DataModel>({
  id: "mock-phone",
  authorize: async (params, ctx) => {
    if (params.phone === undefined) {
      throw new Error("`phone` param is missing for Twilio");
    }
    return await ctx.runAction(internal.auth.login, {
      phone: params.phone as string,
    });
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [mockPhoneLogin],
  // callbacks: {
  // //   afterUserCreatedOrUpdated: async (ctx, args) => {
  // //     if (args.existingUserId) return;
  // //     ctx.db.normalizeId()

  // //     await ctx.db.insert("userProfiles", {
  // //       userId,
  // //       displayName: args.displayName,
  // //       status: args.status,
  // //       lastSeen: Date.now(),
  // //       isOnline: true,
  // //       preferredLanguage: "",
  // //     });
  // //   },
  // },
});

export const login = internalAction({
  args: v.object({
    phone: v.string(),
  }),
  returns: v.object({ userId: v.id("users") }),
  handler: async (ctx, { phone }) => {
    const existingUser = (await ctx.runQuery(internal.auth.getUserByPhone, {
      phone,
    })) as { _id: Id<"users"> } | undefined;
    if (existingUser) {
      return { userId: existingUser._id };
    }
    const { user } = await createAccount(ctx, {
      provider: "mock-phone",
      account: {
        id: phone,
      },
      profile: {
        phone: phone,
      },
      // shouldLinkViaPhone: true,
    });
    await ctx.runMutation(internal.profiles.create, {
      displayName: phone,
      isOnline: false,
      lastSeen: new Date().getTime(),
      userId: user._id,
      preferredLanguage: "pt",
    });
    return { userId: user._id };
  },
});

export const getUserByPhone = internalQuery({
  args: v.object({ phone: v.string() }),
  handler: async (ctx, { phone }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("phone")
      .filter((q) => q.eq(q.field("phone"), phone))
      .unique();
    return existingUser;
  },
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
