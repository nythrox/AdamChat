import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  conversations: defineTable({
    name: v.optional(v.string()),
    isGroup: v.boolean(),
    lastMessageId: v.optional(v.id("messages")),
    lastMessageTime: v.optional(v.number()),
  }).index("by_last_message_time", ["lastMessageTime"]),
  conversation_users: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    unreadCount: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"]),
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("image")),
    // readBy: v.array(
    //   v.object({
    //     userId: v.id("users"),
    //     readAt: v.number(),
    //   })
    // ),
    translations: v.optional(v.record(v.string(), v.string())),
  }).index("by_conversation", ["conversationId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    avatar: v.optional(v.id("_storage")),
    status: v.optional(v.string()),
    lastSeen: v.number(),
    isOnline: v.boolean(),
    preferredLanguage: v.string(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
