import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Avatar,
  Chip,
} from "@heroui/react";

interface NewChatModalProps {
  onClose: () => void;
  isOpen: boolean,
  onConversationCreated: (id: Id<"conversations">) => void;
}

export function NewChatModal({
  onClose,
  onConversationCreated,
  isOpen
}: NewChatModalProps) {
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchUsers = useQuery(api.users.searchUsers, { identification: search.trim() });
  const createConversation = useMutation(api.conversations.createConversation);

  const handleCreateChat = async (userId: Id<"users">) => {
    setIsLoading(true);
    try {
      const conversationId = await createConversation({
        participantIds: [userId],
        isGroup: false,
      });
      onConversationCreated(conversationId);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">New Chat</h2>
          <p className="text-sm text-default-500">
            Search for users by email to start a conversation
          </p>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            <Input
              type="email"
              label="Search by email"
              placeholder="Enter email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              variant="bordered"
              radius="sm"
            />

            {search.trim() && (
              <div className="space-y-3">
                {searchUsers === undefined ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" color="primary" />
                  </div>
                ) : searchUsers.length === 0 ? (
                  <div className="text-center py-4">
                    <Chip variant="flat" color="default">
                      No users found with that email
                    </Chip>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-3 bg-default-100 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.displayName}
                            size="sm"
                            color="primary"
                            isBordered
                          />
                          <div>
                            <p className="font-medium text-foreground truncate max-w-[160px]" title={user.displayName}>
                              {user.displayName}
                            </p>
                          </div>
                        </div>
                        <Button
                          color="primary"
                          size="sm"
                          onPress={() => handleCreateChat(user.userId)}
                          disabled={isLoading}
                          isLoading={isLoading}
                        >
                          {isLoading ? "Creating..." : "Chat"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
