import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useSuspenseQuery } from "@/lib/useSuspenseQuery";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpIcon,
  MicrophoneIcon,
  PaperclipIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";

interface ChatWindowProps {
  conversationId: Id<"conversations">;
}

const truncateText = (text: string, maxLength: number = 60) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export function ChatWindowRoute() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return <ChatWindow conversationId={id as Id<"conversations">} />;
}
export function ChatWindow({ conversationId }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const navigate = useNavigate();

  const messages = useQuery(api.messages.getMessages, {
    conversationId,
  });

  const conversation = useQuery(api.conversations.getConversationInfo, {
    conversationId,
  });

  const sendMessage = useMutation(api.messages.sendMessage);
  const currentUser = useQuery(api.users.getCurrentUser);

  const lang = currentUser?.profile.preferredLanguage;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setMessage("");
      await sendMessage({
        conversationId,
        content: message.trim(),
        messageType: "text",
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!messages || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const conversationInfo = {
    name: "Loading...",
    isOnline: false,
  };

  if (conversation?.conversation.isGroup == false) {
    const otherParticipant = conversation?.participants.find(
      (p) => p.userId != currentUser.user._id
    )!;
    conversationInfo.name = otherParticipant?.displayName;
    conversationInfo.isOnline = otherParticipant?.isOnline;
  }

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-800 transition-colors p-1"
            title="Back to homepage"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
              {conversationInfo.name[0].toUpperCase()}
            </div>
            {conversationInfo.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {conversationInfo.name}
            </h2>
            <p className="text-sm text-gray-500">
              {conversationInfo.isOnline ? "Online" : "Last seen recently"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.isDone && messages.page.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.page.map((msg) => {
            const lang = currentUser?.profile.preferredLanguage;

            const isCurrentUser = msg.senderId === currentUser.user?._id;
            const translation = msg.translations?.[lang ?? ""];
            const original = msg.content;
            const isExpanded = expandedMessages.has(msg._id);
            const shouldTruncate = original.length > 60;
            return (
              <div
                key={msg._id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? "bg-green-500 text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  {translation ? (
                    <>
                      <p className="text-sm">
                        {isExpanded ? original : translation}
                      </p>
                      <p className="text-xs text-gray-400">
                        {isExpanded
                          ? translation
                          : shouldTruncate && !isExpanded
                            ? truncateText(original)
                            : original}

                        {shouldTruncate && (
                          <button
                            onClick={() => toggleMessageExpansion(msg._id)}
                            className={`text-xs mt-1 ml-1 underline hover:no-underline transition-all inline ${
                              isCurrentUser ? "text-green-100" : "text-blue-500"
                            }`}
                          >
                            {isExpanded ? "hide" : "see original"}
                          </button>
                        )}
                      </p>
                    </>
                  ) : (
                    <p
                      className={`text-xs ${!isCurrentUser ? "text-gray-400" : ""}`}
                    >
                      {original}
                    </p>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      isCurrentUser ? "text-green-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg._creationTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white p-4 border-t border-gray-200">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center space-x-3"
        >
          <button
            type="button"
            onClick={() => {}}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <PaperclipIcon size={20} />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="button"
              className="absolute right-3 top-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <MicrophoneIcon />
            </button>
          </div>

          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUpIcon />
          </button>
        </form>
      </div>
    </div>
  );
}
