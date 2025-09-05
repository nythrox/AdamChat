import { ConvexError, v } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getUserProfile, guaranteeAuthUserId } from "./users";

export const canAccessConversation = async (
  ctx: QueryCtx,
  conversationId: Id<"conversations">
) => {
  const userId = await guaranteeAuthUserId(ctx);
  const conversation = await ctx.db
    .query("conversation_users")
    .withIndex("by_conversation")
    .filter((q) =>
      q.and(
        q.eq(q.field("conversationId"), conversationId),
        q.eq(q.field("userId"), userId)
      )
    )
    .unique();

  if (!conversation) {
    throw new ConvexError("Not a member of conversation");
  }

  return conversation;
};

export const getConversationParticipants = async (
  ctx: QueryCtx,
  conversationId: Id<"conversations">
) => {
  const participantIds = await ctx.db
    .query("conversation_users")
    .withIndex("by_conversation")
    .filter((q) => q.eq(q.field("conversationId"), conversationId))
    .collect();

  return Promise.all(
    participantIds.map(
      async ({ userId }) => (await getUserProfile(ctx, userId))!
    )
  );
};

export const getConversationInfo = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { conversationId }) => {
    await canAccessConversation(ctx, conversationId);

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      throw new ConvexError("Conversation not found");
    }

    const participants = await getConversationParticipants(ctx, conversationId);

    return {
      conversation,
      participants,
    };
  },
});

export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await guaranteeAuthUserId(ctx);

    const conversationIds = await ctx.db
      .query("conversation_users")
      .withIndex("by_user")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    const conversations = await Promise.all(
      conversationIds.map(async (conversationUser) => ({
        conversationUser,
        conversation: (await ctx.db.get(conversationUser.conversationId))!,
      }))
    );

    // Get conversation details with participant info and last message
    const conversationsWithDetails = await Promise.all(
      conversations.map(async ({ conversation, conversationUser }) => {
        const participants = await getConversationParticipants(
          ctx,
          conversation._id
        );

        // Get last message
        const lastMessage =
          conversation.lastMessageId &&
          (await ctx.db.get(conversation.lastMessageId));

        return {
          conversation,
          participants,
          lastMessage,
          unreadCount: conversationUser.unreadCount,
        };
      })
    );

    // Sort by last message time
    return conversationsWithDetails.sort(
      (a, b) =>
        (b.lastMessage?._creationTime || 0) -
        (b.lastMessage?._creationTime || 0)
    );
  },
});

export const createConversation = mutation({
  args: {
    participantIds: v.array(v.id("users")),
    name: v.optional(v.string()),
    isGroup: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await guaranteeAuthUserId(ctx);

    // Add current user to participants
    args.participantIds.push(userId);

    // For non-group chats, check if conversation already exists
    // if (!args.isGroup && participantIds.length === 1) {
    //   const allConversations = await ctx.db.query("conversations").collect();
    //   const existingConversation = allConversations.find(
    //     (conv) =>
    //       !conv.isGroup &&
    //       conv.participants.length === 2 &&
    //       conv.participants.includes(userId) &&
    //       conv.participants.includes(participantIds[0])
    //   );

    //   if (existingConversation) {
    //     return existingConversation._id;
    //   }
    // }

    const conversationId = await ctx.db.insert("conversations", {
      name: args.name,
      isGroup: args.isGroup,
    });

    await Promise.all(
      args.participantIds.map(async (userId) => {
        await ctx.db.insert("conversation_users", {
          conversationId,
          unreadCount: 0,
          userId,
        });
      })
    );

    return conversationId;
  },
});
