import { v } from "convex/values";
import {
  query,
  mutation,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { crud } from "convex-helpers/server/crud";
import schema from "./schema";
import { getOwnProfile, guaranteeAuthUserId } from "./users";
import {
  canAccessConversation,
  getConversationParticipants,
} from "./conversations";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("image")),
  },
  handler: async (ctx, args) => {
    const userId = await guaranteeAuthUserId(ctx);
    const profile = await getOwnProfile(ctx);

    await canAccessConversation(ctx, args.conversationId);

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      content: args.content,
      messageType: args.messageType,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageTime: Date.now(),
    });

    if (args.messageType === "text" && args.content) {
      const participants = await getConversationParticipants(
        ctx,
        args.conversationId
      );
      const languagesToTranslate = new Set(
        participants
          .filter((p) => p._id != profile._id)
          .map((p) => p.preferredLanguage)
      );
      await ctx.scheduler.runAfter(0, internal.messages.translateMessage, {
        messageId,
        content: args.content,
        languages: [...languagesToTranslate],
      });
    }

    await ctx.runMutation(internal.messages.incrementUnreadCount, {
      conversationId: args.conversationId,
      senderId: userId,
    });
    return messageId;
  },
});

export const incrementUnreadCount = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("conversation_users")
      .withIndex("by_conversation")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .collect();

    for (const { unreadCount, userId, _id } of participants) {
      if (userId != args.senderId)
        await ctx.db.patch(_id, { unreadCount: unreadCount + 1 });
    }
  },
});

export const resetUnreadCount = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const convo = await canAccessConversation(ctx, args.conversationId);
    await ctx.db.patch(convo._id, { unreadCount: 0 });
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await guaranteeAuthUserId(ctx);
    await canAccessConversation(ctx, args.conversationId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: 50,
      });
    return messages;
  },
});

// TODO: update conversation[userId].unreadMessages
// export const markReadUntil = mutation({
//   args: {
//     conversationId: v.id("conversations"),
//     timestamp: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const userId = await guaranteeAuthUserId(ctx);
//     // Verify user is part of the conversation
//     const conversation = await ctx.db.get(args.conversationId);

//     // Get all messages in the conversation up to the given timestamp
//     const messages = await ctx.db
//       .query("messages")
//       .withIndex("by_conversation", (q) =>
//         q.eq("conversationId", args.conversationId)
//       )
//       .filter((q) => q.lte("createdAt", args.timestamp))
//       .collect();

//     // For each message, if not already marked as read by this user, patch it
//     await Promise.all(
//       messages.map(async (message) => {
//         const alreadyRead = message.readBy.some(
//           (read) => read.userId === userId
//         );
//         if (!alreadyRead) {
//           await ctx.db.patch(message._id, {
//             readBy: [
//               ...message.readBy,
//               {
//                 userId: userId,
//                 readAt: Date.now(),
//               },
//             ],
//           });
//         }
//       })
//     );
//   },
// });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const { create, destroy, read, update } = crud(schema, "messages");

export const translateMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    languages: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { content, messageId, languages }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text to the following languages: ${languages.join(", ")}. Maintain the original meaning and tone. Return a Record<string, string> where the key is the language and the value is the translated mesage.`,
        },
        {
          role: "user",
          content: content,
        },
      ],
      temperature: 0.3,
    });

    // TODO: voice messages

    const translatedContent = completion.choices[0]?.message?.content;

    console.log("translated", content, translatedContent);

    if (translatedContent) {
      const langmap = JSON.parse(translatedContent) as Record<string, string>;
      const message = await ctx.runQuery(internal.messages.read, {
        id: messageId,
      });
      const translations = message!.translations ?? {};
      await ctx.runMutation(internal.messages.update, {
        id: messageId,
        patch: { translations: { ...translations, ...langmap } },
      });
    }
    return null;
  },
});
