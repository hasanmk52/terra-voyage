import { z } from 'zod'
import { CollaborationRole, InvitationStatus, NotificationType } from '@prisma/client'

// Base collaboration types
export interface CollaboratorInfo {
  id: string
  userId: string
  name: string | null
  email: string
  image: string | null
  role: CollaborationRole
  joinedAt: Date
  isOnline?: boolean
}

export interface TripCollaboration {
  id: string
  tripId: string
  collaborators: CollaboratorInfo[]
  owner: CollaboratorInfo
  permissions: {
    canEdit: boolean
    canInvite: boolean
    canDelete: boolean
    canManageMembers: boolean
    canVote: boolean
    canComment: boolean
  }
}

// Invitation types
export interface InvitationData {
  id: string
  token: string
  email: string
  tripId: string
  tripTitle: string
  role: CollaborationRole
  invitedBy: {
    name: string | null
    email: string
  }
  message: string | null
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
}

// Real-time collaboration types
export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'activity_updated' | 'trip_updated' | 'comment_added' | 'vote_added'
  userId: string
  userName: string | null
  tripId: string
  data?: any
  timestamp: Date
}

export interface UserPresence {
  userId: string
  userName: string | null
  userImage: string | null
  isOnline: boolean
  lastSeen: Date
  currentPage?: string
}

// Notification types
export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: Date
  trip?: {
    id: string
    title: string
  }
}

// Validation schemas
export const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.nativeEnum(CollaborationRole),
  message: z.string().optional(),
})

export const updateCollaboratorRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(CollaborationRole),
})

export const shareableLinkSchema = z.object({
  tripId: z.string(),
  role: z.nativeEnum(CollaborationRole).default(CollaborationRole.VIEWER),
  expiresIn: z.number().min(1).max(365).default(7), // days
})

// Voting types
export interface VoteData {
  id: string
  userId: string
  userName: string | null
  userImage: string | null
  value: number // 1 for upvote, -1 for downvote, 0 for neutral
  createdAt: Date
}

export interface ActivityVotes {
  activityId: string
  votes: VoteData[]
  totalVotes: number
  userVote?: VoteData
  consensus: 'positive' | 'negative' | 'neutral' | 'mixed'
}

export const voteSchema = z.object({
  activityId: z.string(),
  value: z.number().min(-1).max(1),
})

// Comment types
export interface CommentData {
  id: string
  content: string
  userId: string
  userName: string | null
  userImage: string | null
  createdAt: Date
  updatedAt: Date
  parentId?: string
  replies?: CommentData[]
  tripId?: string
  activityId?: string
}

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  tripId: z.string().optional(),
  activityId: z.string().optional(),
  parentId: z.string().optional(),
})

// Permission utilities
export const ROLE_PERMISSIONS = {
  [CollaborationRole.OWNER]: {
    canEdit: true,
    canInvite: true,
    canDelete: true,
    canManageMembers: true,
    canVote: true,
    canComment: true,
  },
  [CollaborationRole.ADMIN]: {
    canEdit: true,
    canInvite: true,
    canDelete: false,
    canManageMembers: true,
    canVote: true,
    canComment: true,
  },
  [CollaborationRole.EDITOR]: {
    canEdit: true,
    canInvite: false,
    canDelete: false,
    canManageMembers: false,
    canVote: true,
    canComment: true,
  },
  [CollaborationRole.VIEWER]: {
    canEdit: false,
    canInvite: false,
    canDelete: false,
    canManageMembers: false,
    canVote: true,
    canComment: true,
  },
}

export function hasPermission(role: CollaborationRole, permission: keyof typeof ROLE_PERMISSIONS[CollaborationRole]) {
  return ROLE_PERMISSIONS[role][permission]
}

export function canUserPerformAction(userRole: CollaborationRole, action: string): boolean {
  switch (action) {
    case 'edit_trip':
    case 'edit_activity':
      return hasPermission(userRole, 'canEdit')
    case 'invite_members':
      return hasPermission(userRole, 'canInvite')
    case 'delete_trip':
      return hasPermission(userRole, 'canDelete')
    case 'manage_members':
    case 'remove_member':
    case 'change_role':
      return hasPermission(userRole, 'canManageMembers')
    case 'vote':
      return hasPermission(userRole, 'canVote')
    case 'comment':
      return hasPermission(userRole, 'canComment')
    default:
      return false
  }
}

// Utility functions
export function generateInvitationUrl(token: string): string {
  return `${process.env.NEXTAUTH_URL}/invite/${token}`
}

export function generateShareableUrl(tripId: string, token?: string): string {
  const baseUrl = `${process.env.NEXTAUTH_URL}/trip/${tripId}`
  return token ? `${baseUrl}?share=${token}` : baseUrl
}

export function isInvitationExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function getExpirationDate(daysFromNow: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date
}

export function getRoleDisplayName(role: CollaborationRole): string {
  switch (role) {
    case CollaborationRole.OWNER:
      return 'Owner'
    case CollaborationRole.ADMIN:
      return 'Admin'
    case CollaborationRole.EDITOR:
      return 'Editor'
    case CollaborationRole.VIEWER:
      return 'Viewer'
    default:
      return 'Unknown'
  }
}

export function getVoteConsensus(votes: VoteData[]): 'positive' | 'negative' | 'neutral' | 'mixed' {
  if (votes.length === 0) return 'neutral'
  
  const positiveVotes = votes.filter(v => v.value > 0).length
  const negativeVotes = votes.filter(v => v.value < 0).length
  const totalVotes = positiveVotes + negativeVotes
  
  if (totalVotes === 0) return 'neutral'
  
  const positiveRatio = positiveVotes / totalVotes
  
  if (positiveRatio >= 0.8) return 'positive'
  if (positiveRatio <= 0.2) return 'negative'
  if (positiveRatio >= 0.4 && positiveRatio <= 0.6) return 'mixed'
  
  return positiveRatio > 0.5 ? 'positive' : 'negative'
}