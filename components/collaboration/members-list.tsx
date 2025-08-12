"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TripCollaboration,
  CollaboratorInfo,
  getRoleDisplayName,
} from "@/lib/collaboration-types";
import { CollaborationRole } from "@prisma/client";
import {
  MoreVertical,
  Crown,
  Shield,
  Edit,
  Eye,
  UserMinus,
  Mail,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

interface MembersListProps {
  tripId: string;
  collaboration: TripCollaboration;
  canManageMembers: boolean;
  onMemberUpdate?: () => void;
  className?: string;
}

export function MembersList({
  tripId,
  collaboration,
  canManageMembers,
  onMemberUpdate,
  className = "",
}: MembersListProps) {
  const [memberToRemove, setMemberToRemove] = useState<CollaboratorInfo | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleRoleChange = async (
    memberId: string,
    newRole: CollaborationRole
  ) => {
    setIsUpdating(memberId);
    try {
      const response = await fetch("/api/collaboration/members", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripId,
          userId: memberId,
          role: newRole,
        }),
      });

      if (response.ok) {
        onMemberUpdate?.();
      } else {
        const error = await response.json();
        console.error("Failed to update role:", error);
      }
    } catch (error) {
      console.error("Network error updating role:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveMember = async (member: CollaboratorInfo) => {
    setIsUpdating(member.userId);
    try {
      const response = await fetch(
        `/api/collaboration/members?tripId=${tripId}&userId=${member.userId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        onMemberUpdate?.();
        setMemberToRemove(null);
      } else {
        const error = await response.json();
        console.error("Failed to remove member:", error);
      }
    } catch (error) {
      console.error("Network error removing member:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const getRoleIcon = (role: CollaborationRole) => {
    switch (role) {
      case CollaborationRole.OWNER:
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case CollaborationRole.ADMIN:
        return <Shield className="h-4 w-4 text-purple-600" />;
      case CollaborationRole.EDITOR:
        return <Edit className="h-4 w-4 text-blue-600" />;
      case CollaborationRole.VIEWER:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: CollaborationRole) => {
    switch (role) {
      case CollaborationRole.OWNER:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case CollaborationRole.ADMIN:
        return "bg-purple-100 text-purple-800 border-purple-200";
      case CollaborationRole.EDITOR:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case CollaborationRole.VIEWER:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canChangeRole = (member: CollaboratorInfo) => {
    return canManageMembers && member.role !== CollaborationRole.OWNER;
  };

  const canRemoveMember = (member: CollaboratorInfo) => {
    return canManageMembers && member.role !== CollaborationRole.OWNER;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {collaboration.collaborators.map((member, index) => (
        <motion.div
          key={member.userId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={member.image || undefined}
                  alt={member.name || "User"}
                />
                <AvatarFallback>
                  {(member.name || member.email)?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator would go here if you have real-time presence */}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">
                  {member.name || "Unknown User"}
                </p>
                {member.role === CollaborationRole.OWNER && (
                  <Crown className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{member.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${getRoleBadgeColor(member.role)}`}
                >
                  <span className="flex items-center gap-1">
                    {getRoleIcon(member.role)}
                    {getRoleDisplayName(member.role)}
                  </span>
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {(canChangeRole(member) || canRemoveMember(member)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUpdating === member.userId}
                >
                  {isUpdating === member.userId ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canChangeRole(member) && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        handleRoleChange(member.userId, CollaborationRole.ADMIN)
                      }
                      disabled={member.role === CollaborationRole.ADMIN}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleRoleChange(
                          member.userId,
                          CollaborationRole.EDITOR
                        )
                      }
                      disabled={member.role === CollaborationRole.EDITOR}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Make Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleRoleChange(
                          member.userId,
                          CollaborationRole.VIEWER
                        )
                      }
                      disabled={member.role === CollaborationRole.VIEWER}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Make Viewer
                    </DropdownMenuItem>
                  </>
                )}

                {canRemoveMember(member) && (
                  <>
                    {canChangeRole(member) && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => setMemberToRemove(member)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Member
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </motion.div>
      ))}

      {collaboration.collaborators.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No collaborators yet</p>
          <p className="text-xs">Invite people to start collaborating</p>
        </div>
      )}

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.name || memberToRemove?.email}</strong>{" "}
              from this trip? They will lose access to all trip information and
              won't be able to make changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                memberToRemove && handleRemoveMember(memberToRemove)
              }
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isUpdating === memberToRemove?.userId}
            >
              {isUpdating === memberToRemove?.userId ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Removing...
                </div>
              ) : (
                "Remove Member"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MembersList;
