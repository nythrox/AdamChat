import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewChatModal } from "./NewChatModal";
import { ProfileModal } from "./ProfileModal";
import { SignOutButton } from "../SignOutButton";
import { useAtom } from "jotai";
import { atomWithSearchParams } from "jotai-location";
import { Button, Input } from "@heroui/react";

import { FileSearchIcon, PlusIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

export function WhatsAppChat() {
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const currentUser = useQuery(api.users.getCurrentUser);
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);

  // Update online status
  useEffect(() => {
    updateOnlineStatus({ isOnline: true });

    const interval = setInterval(() => {
      updateOnlineStatus({ isOnline: true });
    }, 30000); // Update every 30 seconds

    const handleBeforeUnload = () => {
      updateOnlineStatus({ isOnline: false });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      updateOnlineStatus({ isOnline: false });
    };
  }, [updateOnlineStatus]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowProfile(true)}
                className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold hover:bg-green-600 transition-colors"
              >
                {currentUser.profile.displayName[0].toUpperCase()}
              </button>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {currentUser.profile.displayName}
                </h2>
                <p className="text-sm text-gray-500">Online</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-full transition-colors"
                title="New Chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              <SignOutButton />
            </div>
          </div>
        </div>

        <Input
          classNames={{
            base: "p-2",
            input: "text-small",
            inputWrapper: "font-normal text-default-500 bg-default-400/20",
          }}
          placeholder="Type to search..."
          startContent={<FileSearchIcon size={18} />}
          type="search"
        />

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            onSelectConversation={(id) => {
              navigate(`/chat/${id}`);
            }}
          />
        </div>
      </div>

      {/* Chat Area */}
      {/* <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <ChatWindow conversationId={selectedConversationId} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-8 opacity-20">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-gray-400">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-light text-gray-600 mb-2">WhatsApp Web</h2>
              <p className="text-gray-500 max-w-md">
                Send and receive messages without keeping your phone online.
                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
            </div>
          </div>
        )}
      </div> */}

      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onConversationCreated={(id) => {
          navigate(`/chat/${id}`);
          setShowNewChat(false);
        }}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          isIconOnly
          variant="solid"
          onPress={() => setShowNewChat(true)}
          aria-label="New Chat"
        >
          <PlusIcon size={24} />
        </Button>
      </div>
    </div>
  );
}
