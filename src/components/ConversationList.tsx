import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card } from "@heroui/react";

interface ConversationListProps {
  onSelectConversation: (id: Id<"conversations">) => void;
}

export function ConversationList({
  onSelectConversation,
}: ConversationListProps) {
  const conversations = useQuery(api.conversations.getConversations);

  const currentUser = useQuery(api.users.getCurrentUser);

  if (!conversations) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No conversations yet.</p>
        <p className="text-sm mt-1">Start a new chat to begin messaging!</p>
      </div>
    );
  }

  return (
    <div>
      {conversations.map(
        ({ conversation, participants, lastMessage, unreadCount }) => {
          const displayName = conversation.isGroup
            ? conversation.name!
            : participants.find((p) => p._id != currentUser?.profile._id)
                ?.displayName;
          return (
            <Card
              isPressable
              key={conversation._id}
              onClick={() => onSelectConversation(conversation._id)}
              className={`flex flex-row p-4 border-b border-gray-100 rounded-none shadow-none w-full`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {displayName?.split(" ").join("").slice(0, 3).toUpperCase()}
                </div>
                {!conversation.isGroup && participants[0]?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                )}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {displayName}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-gray-500">
                      {new Date(lastMessage._creationTime).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {lastMessage && (
                      <>
                        {/* {lastMessage.content && "You: "} */}
                        {lastMessage.messageType === "image"
                          ? "📷 Image"
                          : lastMessage.content}
                      </>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        }
      )}
    </div>
  );
}
