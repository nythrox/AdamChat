import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Avatar,
  PressEvent,
  Select,
  SelectItem,
} from "@heroui/react";
import { useSuspenseQuery } from "@/lib/useSuspenseQuery";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS = [
  { key: "en", label: "English" },
  { key: "pt", label: "Português" },
  { key: "es", label: "Español" },
];

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const currentUser = useSuspenseQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);

  const [editedProfile, setEditedProfile] = useState(currentUser?.profile);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEditedProfile(currentUser.profile);
  }, [currentUser.profile]);

  const handleSave = async (e: PressEvent) => {
    if (!editedProfile.displayName.trim()) return;

    setIsLoading(true);
    try {
      await updateProfile({
        displayName: editedProfile.displayName,
        preferredLanguage: editedProfile.preferredLanguage,
        status: editedProfile.status,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Profile</h2>
        </ModalHeader>

        <form>
          <ModalBody className="space-y-4">
            <div className="flex justify-center mb-6">
              <Avatar
                name={editedProfile.displayName[0]?.toUpperCase() || "U"}
                size="lg"
                className="bg-green-500 text-white text-2xl font-semibold"
              />
            </div>

            <Input
              type="text"
              label="Display Name"
              value={editedProfile.displayName}
              onChange={(e) =>
                setEditedProfile({
                  ...editedProfile,
                  displayName: e.target.value,
                })
              }
              required
              autoFocus
            />

            <Input
              type="email"
              label="Email"
              value={currentUser.user?.email || ""}
              isDisabled
              description="Email cannot be changed"
            />

            <Select
              label="Preferred Language"
              selectedKeys={[editedProfile.preferredLanguage]}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as string;
                setEditedProfile({
                  ...editedProfile,
                  preferredLanguage: selectedKey,
                });
              }}
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <SelectItem key={language.key}>
                  {language.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              type="text"
              label="Status"
              value={editedProfile.status}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, status: e.target.value })
              }
              placeholder="What's on your mind?"
            />
          </ModalBody>

          <ModalFooter>
            <Button color="default" variant="bordered" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="success"
              onPress={handleSave}
              isLoading={isLoading}
              isDisabled={!editedProfile.displayName.trim()}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
