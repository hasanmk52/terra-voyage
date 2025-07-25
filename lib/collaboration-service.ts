import { PrismaClient, CollaborationRole, InvitationStatus, NotificationType } from '@prisma/client'
import { 
  CollaboratorInfo, 
  TripCollaboration, 
  InvitationData, 
  NotificationData,
  ROLE_PERMISSIONS,
  getExpirationDate 
} from './collaboration-types'

const prisma = new PrismaClient()

export class CollaborationService {
  
  // Get trip collaboration data with all collaborators
  async getTripCollaboration(tripId: string, userId: string): Promise<TripCollaboration | null> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          { collaborations: { some: { userId } } }
        ]
      },
      include: {
        user: true,
        collaborations: {
          include: {
            user: true
          }
        }
      }
    })

    if (!trip) return null

    const owner: CollaboratorInfo = {
      id: trip.user.id,
      userId: trip.user.id,
      name: trip.user.name,
      email: trip.user.email,
      image: trip.user.image,
      role: CollaborationRole.OWNER,
      joinedAt: trip.createdAt
    }

    const collaborators: CollaboratorInfo[] = trip.collaborations
      .filter(collab => collab.user)
      .map(collab => ({
        id: collab.id,
        userId: collab.user!.id,
        name: collab.user!.name,
        email: collab.user!.email,
        image: collab.user!.image,
        role: collab.role,
        joinedAt: collab.acceptedAt || collab.createdAt
      }))

    // Get user's role and permissions
    const userRole = trip.userId === userId 
      ? CollaborationRole.OWNER 
      : trip.collaborations.find(c => c.userId === userId)?.role || CollaborationRole.VIEWER

    return {
      id: trip.id,
      tripId: trip.id,
      collaborators: [owner, ...collaborators],
      owner,
      permissions: ROLE_PERMISSIONS[userRole]
    }
  }

  // Create invitation for trip sharing
  async createInvitation(
    tripId: string, 
    invitedById: string, 
    email: string, 
    role: CollaborationRole,
    message?: string,
    expiresInDays: number = 7
  ): Promise<InvitationData> {
    // Check if user can invite
    const canInvite = await this.canUserInvite(tripId, invitedById)
    if (!canInvite) {
      throw new Error('User does not have permission to invite members')
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findUnique({
      where: {
        tripId_email: {
          tripId,
          email
        }
      }
    })

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new Error('Invitation already sent to this email')
    }

    // Get trip and inviter info
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { user: true }
    })

    const inviter = await prisma.user.findUnique({
      where: { id: invitedById }
    })

    if (!trip || !inviter) {
      throw new Error('Trip or inviter not found')
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        tripId,
        invitedById,
        role,
        message,
        expiresAt: getExpirationDate(expiresInDays),
        status: InvitationStatus.PENDING
      }
    })

    // Create notification for trip owner if different from inviter
    if (trip.userId !== invitedById) {
      await this.createNotification({
        userId: trip.userId,
        tripId,
        type: NotificationType.MEMBER_JOINED,
        title: 'New member invited',
        message: `${inviter.name || inviter.email} invited ${email} to join your trip`,
        data: { invitationId: invitation.id, email, role }
      })
    }

    return {
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      tripId: invitation.tripId,
      tripTitle: trip.title,
      role: invitation.role,
      invitedBy: {
        name: inviter.name,
        email: inviter.email
      },
      message: invitation.message,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt
    }
  }

  // Accept invitation
  async acceptInvitation(token: string, userId: string): Promise<boolean> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        trip: true,
        invitedBy: true
      }
    })

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation is no longer valid')
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED }
      })
      throw new Error('Invitation has expired')
    }

    // Check if user is already a collaborator
    const existingCollaboration = await prisma.collaboration.findUnique({
      where: {
        tripId_userId: {
          tripId: invitation.tripId,
          userId
        }
      }
    })

    if (existingCollaboration) {
      throw new Error('User is already a collaborator on this trip')
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Create collaboration
      await tx.collaboration.create({
        data: {
          tripId: invitation.tripId,
          userId,
          role: invitation.role,
          invitedBy: invitation.invitedById,
          acceptedAt: new Date()
        }
      })

      // Update invitation
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          userId,
          acceptedAt: new Date()
        }
      })

      // Get user info for notification
      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      // Notify trip owner and inviter
      const notificationPromises = []

      if (invitation.trip.userId !== userId) {
        notificationPromises.push(
          tx.notification.create({
            data: {
              userId: invitation.trip.userId,
              tripId: invitation.tripId,
              type: NotificationType.MEMBER_JOINED,
              title: 'Member joined trip',
              message: `${user?.name || user?.email} joined your trip "${invitation.trip.title}"`,
              data: { userId, role: invitation.role }
            }
          })
        )
      }

      if (invitation.invitedById !== invitation.trip.userId && invitation.invitedById !== userId) {
        notificationPromises.push(
          tx.notification.create({
            data: {
              userId: invitation.invitedById,
              tripId: invitation.tripId,
              type: NotificationType.MEMBER_JOINED,
              title: 'Invitation accepted',
              message: `${user?.name || user?.email} accepted your invitation to "${invitation.trip.title}"`,
              data: { userId, role: invitation.role }
            }
          })
        )
      }

      await Promise.all(notificationPromises)
    })

    return true
  }

  // Decline invitation
  async declineInvitation(token: string): Promise<boolean> {
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation is no longer valid')
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
        declinedAt: new Date()
      }
    })

    return true
  }

  // Remove collaborator
  async removeCollaborator(tripId: string, requesterId: string, targetUserId: string): Promise<boolean> {
    // Check permissions
    const canManage = await this.canUserManageMembers(tripId, requesterId)
    if (!canManage) {
      throw new Error('User does not have permission to remove members')
    }

    // Cannot remove trip owner
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (trip?.userId === targetUserId) {
      throw new Error('Cannot remove trip owner')
    }

    // Remove collaboration
    const collaboration = await prisma.collaboration.delete({
      where: {
        tripId_userId: {
          tripId,
          userId: targetUserId
        }
      },
      include: {
        user: true,
        trip: true
      }
    })

    // Create notification for removed user
    await this.createNotification({
      userId: targetUserId,
      tripId,
      type: NotificationType.MEMBER_LEFT,
      title: 'Removed from trip',
      message: `You have been removed from "${collaboration.trip.title}"`,
      data: { removedBy: requesterId }
    })

    return true
  }

  // Update collaborator role
  async updateCollaboratorRole(
    tripId: string, 
    requesterId: string, 
    targetUserId: string, 
    newRole: CollaborationRole
  ): Promise<boolean> {
    // Check permissions
    const canManage = await this.canUserManageMembers(tripId, requesterId)
    if (!canManage) {
      throw new Error('User does not have permission to manage member roles')
    }

    // Cannot change owner role or promote to owner
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (trip?.userId === targetUserId || newRole === CollaborationRole.OWNER) {
      throw new Error('Cannot change owner role')
    }

    // Update role
    await prisma.collaboration.update({
      where: {
        tripId_userId: {
          tripId,
          userId: targetUserId
        }
      },
      data: {
        role: newRole,
        updatedAt: new Date()
      }
    })

    // Create notification
    await this.createNotification({
      userId: targetUserId,
      tripId,
      type: NotificationType.TRIP_UPDATE,
      title: 'Role updated',
      message: `Your role has been updated to ${newRole.toLowerCase()}`,
      data: { newRole, updatedBy: requesterId }
    })

    return true
  }

  // Get user's notifications
  async getUserNotifications(userId: string, limit: number = 20): Promise<NotificationData[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        trip: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data as Record<string, any>,
      read: notification.read,
      createdAt: notification.createdAt,
      trip: notification.trip
    }))
  }

  // Mark notification as read
  async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    return true
  }

  // Mark all notifications as read
  async markAllNotificationsRead(userId: string): Promise<boolean> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    return true
  }

  // Create notification helper
  private async createNotification(data: {
    userId: string
    tripId?: string
    type: NotificationType
    title: string
    message: string
    data?: Record<string, any>
  }): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        tripId: data.tripId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data
      }
    })
  }

  // Permission check helpers
  private async canUserInvite(tripId: string, userId: string): Promise<boolean> {
    const userRole = await this.getUserRole(tripId, userId)
    return userRole && ROLE_PERMISSIONS[userRole].canInvite
  }

  private async canUserManageMembers(tripId: string, userId: string): Promise<boolean> {
    const userRole = await this.getUserRole(tripId, userId)
    return userRole && ROLE_PERMISSIONS[userRole].canManageMembers
  }

  private async getUserRole(tripId: string, userId: string): Promise<CollaborationRole | null> {
    // Check if user is owner
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId
      }
    })

    if (trip) return CollaborationRole.OWNER

    // Check collaboration
    const collaboration = await prisma.collaboration.findUnique({
      where: {
        tripId_userId: {
          tripId,
          userId
        }
      }
    })

    return collaboration?.role || null
  }

  // Get invitation by token
  async getInvitationByToken(token: string): Promise<InvitationData | null> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        trip: true,
        invitedBy: true
      }
    })

    if (!invitation) return null

    return {
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      tripId: invitation.tripId,
      tripTitle: invitation.trip.title,
      role: invitation.role,
      invitedBy: {
        name: invitation.invitedBy.name,
        email: invitation.invitedBy.email
      },
      message: invitation.message,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt
    }
  }

  // Clean up expired invitations
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await prisma.invitation.updateMany({
      where: {
        status: InvitationStatus.PENDING,
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: InvitationStatus.EXPIRED
      }
    })

    return result.count
  }
}

export const collaborationService = new CollaborationService()