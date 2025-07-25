import { PrismaClient, NotificationType } from '@prisma/client'
import { CommentData } from './collaboration-types'

const prisma = new PrismaClient()

export class CommentService {
  
  // Create a new comment
  async createComment(data: {
    content: string
    userId: string
    tripId?: string
    activityId?: string
    parentId?: string
  }): Promise<CommentData> {
    const { content, userId, tripId, activityId, parentId } = data

    // Verify access to trip/activity
    let accessTripId = tripId

    if (activityId && !tripId) {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: { tripId: true }
      })
      if (!activity) {
        throw new Error('Activity not found')
      }
      accessTripId = activity.tripId
    }

    if (accessTripId) {
      const hasAccess = await this.verifyTripAccess(accessTripId, userId)
      if (!hasAccess) {
        throw new Error('Access denied')
      }
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        tripId,
        activityId,
        parentId
      }
    })

    // Create notifications for relevant users
    if (accessTripId) {
      await this.createCommentNotifications(comment.id, accessTripId, userId, content, activityId)
    }

    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      userName: user.name,
      userImage: user.image,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      parentId: comment.parentId || undefined,
      tripId: comment.tripId || undefined,
      activityId: comment.activityId || undefined
    }
  }

  // Get comments for a trip
  async getTripComments(tripId: string, requesterId: string): Promise<CommentData[]> {
    // Verify access
    const hasAccess = await this.verifyTripAccess(tripId, requesterId)
    if (!hasAccess) {
      throw new Error('Access denied')
    }

    const comments = await prisma.comment.findMany({
      where: {
        tripId,
        parentId: null // Only get top-level comments
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return comments.map(comment => this.transformComment(comment))
  }

  // Get comments for an activity
  async getActivityComments(activityId: string, requesterId: string): Promise<CommentData[]> {
    // Get activity to verify access
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { tripId: true }
    })

    if (!activity) {
      throw new Error('Activity not found')
    }

    const hasAccess = await this.verifyTripAccess(activity.tripId, requesterId)
    if (!hasAccess) {
      throw new Error('Access denied')
    }

    const comments = await prisma.comment.findMany({
      where: {
        activityId,
        parentId: null // Only get top-level comments
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return comments.map(comment => this.transformComment(comment))
  }

  // Update comment
  async updateComment(commentId: string, userId: string, content: string): Promise<CommentData> {
    // Verify ownership
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    if (!existingComment) {
      throw new Error('Comment not found')
    }

    if (existingComment.userId !== userId) {
      throw new Error('Permission denied - can only edit your own comments')
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date()
      }
    })

    return {
      id: updatedComment.id,
      content: updatedComment.content,
      userId: updatedComment.userId,
      userName: existingComment.user.name,
      userImage: existingComment.user.image,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
      parentId: updatedComment.parentId || undefined,
      tripId: updatedComment.tripId || undefined,
      activityId: updatedComment.activityId || undefined
    }
  }

  // Delete comment
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    // Verify ownership or admin permission
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        trip: true,
        activity: {
          include: {
            trip: true
          }
        }
      }
    })

    if (!comment) {
      throw new Error('Comment not found')
    }

    const tripId = comment.tripId || comment.activity?.tripId
    let canDelete = comment.userId === userId

    // Check if user is trip owner or admin
    if (!canDelete && tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          collaborations: {
            where: {
              userId,
              role: { in: ['OWNER', 'ADMIN'] }
            }
          }
        }
      })

      canDelete = trip?.userId === userId || trip?.collaborations.length > 0
    }

    if (!canDelete) {
      throw new Error('Permission denied')
    }

    // Delete comment and its replies
    await prisma.comment.deleteMany({
      where: {
        OR: [
          { id: commentId },
          { parentId: commentId }
        ]
      }
    })

    return true
  }

  // Get comment count for trip/activity
  async getCommentCount(tripId?: string, activityId?: string): Promise<number> {
    const count = await prisma.comment.count({
      where: {
        tripId,
        activityId
      }
    })

    return count
  }

  // Private helper methods
  private async verifyTripAccess(tripId: string, userId: string): Promise<boolean> {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          { collaborations: { some: { userId } } }
        ]
      }
    })

    return !!trip
  }

  private async createCommentNotifications(
    commentId: string,
    tripId: string,
    commenterId: string,
    content: string,
    activityId?: string
  ): Promise<void> {
    // Get trip info and collaborators
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        collaborations: {
          include: {
            user: true
          }
        }
      }
    })

    if (!trip) return

    const commenter = await prisma.user.findUnique({
      where: { id: commenterId },
      select: { name: true }
    })

    const notificationData = []

    // Notify trip owner (if not the commenter)
    if (trip.userId !== commenterId) {
      notificationData.push({
        userId: trip.userId,
        tripId,
        type: NotificationType.COMMENT_ADDED,
        title: 'New comment on your trip',
        message: `${commenter?.name || 'Someone'} commented: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        data: {
          commentId,
          commenterId,
          commenterName: commenter?.name,
          activityId
        }
      })
    }

    // Notify other collaborators (except the commenter)
    for (const collaboration of trip.collaborations) {
      if (collaboration.userId !== commenterId) {
        notificationData.push({
          userId: collaboration.userId,
          tripId,
          type: NotificationType.COMMENT_ADDED,
          title: 'New comment on trip',
          message: `${commenter?.name || 'Someone'} commented: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          data: {
            commentId,
            commenterId,
            commenterName: commenter?.name,
            activityId
          }
        })
      }
    }

    // Create notifications
    if (notificationData.length > 0) {
      await prisma.notification.createMany({
        data: notificationData
      })
    }
  }

  private transformComment(comment: any): CommentData {
    return {
      id: comment.id,
      content: comment.content,
      userId: comment.userId,
      userName: comment.user.name,
      userImage: comment.user.image,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      parentId: comment.parentId || undefined,
      tripId: comment.tripId || undefined,
      activityId: comment.activityId || undefined,
      replies: comment.replies?.map((reply: any) => ({
        id: reply.id,
        content: reply.content,
        userId: reply.userId,
        userName: reply.user.name,
        userImage: reply.user.image,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        parentId: reply.parentId
      }))
    }
  }
}

export const commentService = new CommentService()