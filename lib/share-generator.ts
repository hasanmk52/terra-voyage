import { Trip, Activity } from '@prisma/client'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

export interface TripWithActivities extends Trip {
  activities: Activity[]
  user: {
    name: string | null
    email: string
  }
}

export interface ShareOptions {
  expiresInDays?: number
  allowComments?: boolean
  showContactInfo?: boolean
  showBudget?: boolean
  password?: string
}

export interface SharedTrip {
  id: string
  tripId: string
  shareToken: string
  isPublic: boolean
  expiresAt: Date | null
  allowComments: boolean
  showContactInfo: boolean
  showBudget: boolean
  passwordHash: string | null
  viewCount: number
  createdAt: Date
  updatedAt: Date
}

export class ShareGenerator {
  /**
   * Generate a shareable link for a trip
   */
  async createShareableLink(
    tripId: string,
    userId: string,
    options: ShareOptions = {}
  ): Promise<{ shareToken: string; shareUrl: string }> {
    const {
      expiresInDays = 30,
      allowComments = false,
      showContactInfo = false,
      showBudget = false,
      password
    } = options

    // Verify user owns or has access to the trip
    const trip = await db.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          {
            collaborations: {
              some: {
                userId,
                role: { in: ['ADMIN', 'EDITOR'] }
              }
            }
          }
        ]
      }
    })

    if (!trip) {
      throw new Error('Trip not found or access denied')
    }

    // Generate secure share token
    const shareToken = this.generateShareToken()
    
    // Calculate expiration date
    const expiresAt = expiresInDays > 0 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    // Hash password if provided
    const passwordHash = password 
      ? await this.hashPassword(password)
      : null

    // Check if a share link already exists for this trip
    const existingShare = await db.sharedTrip.findFirst({
      where: { tripId }
    })

    let sharedTrip: SharedTrip

    if (existingShare) {
      // Update existing share
      sharedTrip = await db.sharedTrip.update({
        where: { id: existingShare.id },
        data: {
          shareToken,
          expiresAt,
          allowComments,
          showContactInfo,
          showBudget,
          passwordHash,
          isPublic: true,
          updatedAt: new Date()
        }
      })
    } else {
      // Create new share
      sharedTrip = await db.sharedTrip.create({
        data: {
          tripId,
          shareToken,
          isPublic: true,
          expiresAt,
          allowComments,
          showContactInfo,
          showBudget,
          passwordHash,
          viewCount: 0
        }
      })
    }

    const shareUrl = `${process.env.NEXTAUTH_URL}/share/${shareToken}`

    return { shareToken, shareUrl }
  }

  /**
   * Get shared trip by token
   */
  async getSharedTrip(
    shareToken: string,
    password?: string
  ): Promise<TripWithActivities | null> {
    const sharedTrip = await db.sharedTrip.findFirst({
      where: {
        shareToken,
        isPublic: true
      },
      include: {
        trip: {
          include: {
            activities: {
              orderBy: [
                { startTime: 'asc' },
                { createdAt: 'asc' }
              ]
            },
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!sharedTrip) {
      return null
    }

    // Check if expired
    if (sharedTrip.expiresAt && sharedTrip.expiresAt < new Date()) {
      return null
    }

    // Check password if required
    if (sharedTrip.passwordHash && !password) {
      throw new Error('Password required')
    }

    if (sharedTrip.passwordHash && password) {
      const isValidPassword = await this.verifyPassword(password, sharedTrip.passwordHash)
      if (!isValidPassword) {
        throw new Error('Invalid password')
      }
    }

    // Increment view count
    await db.sharedTrip.update({
      where: { id: sharedTrip.id },
      data: { viewCount: { increment: 1 } }
    })

    // Filter trip data based on sharing preferences
    const trip = sharedTrip.trip
    
    return {
      ...trip,
      // Hide budget if not allowed
      budget: sharedTrip.showBudget ? trip.budget : null,
      // Filter user info based on contact sharing preference
      user: {
        name: sharedTrip.showContactInfo ? trip.user.name : null,
        email: sharedTrip.showContactInfo ? trip.user.email : 'Hidden'
      }
    }
  }

  /**
   * Revoke a shared link
   */
  async revokeShareableLink(tripId: string, userId: string): Promise<boolean> {
    // Verify user owns or has admin access to the trip
    const trip = await db.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          {
            collaborations: {
              some: {
                userId,
                role: 'ADMIN'
              }
            }
          }
        ]
      }
    })

    if (!trip) {
      return false
    }

    const result = await db.sharedTrip.updateMany({
      where: { tripId },
      data: { 
        isPublic: false,
        updatedAt: new Date()
      }
    })

    return result.count > 0
  }

  /**
   * Get sharing statistics for a trip
   */
  async getShareStats(tripId: string, userId: string) {
    // Verify user owns or has access to the trip
    const trip = await db.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          {
            collaborations: {
              some: {
                userId
              }
            }
          }
        ]
      }
    })

    if (!trip) {
      throw new Error('Trip not found or access denied')
    }

    const sharedTrip = await db.sharedTrip.findFirst({
      where: { tripId }
    })

    if (!sharedTrip) {
      return null
    }

    return {
      shareToken: sharedTrip.shareToken,
      shareUrl: `${process.env.NEXTAUTH_URL}/share/${sharedTrip.shareToken}`,
      isPublic: sharedTrip.isPublic,
      viewCount: sharedTrip.viewCount,
      expiresAt: sharedTrip.expiresAt,
      createdAt: sharedTrip.createdAt,
      allowComments: sharedTrip.allowComments,
      showContactInfo: sharedTrip.showContactInfo,
      showBudget: sharedTrip.showBudget,
      hasPassword: !!sharedTrip.passwordHash
    }
  }

  private generateShareToken(): string {
    return randomBytes(32).toString('hex')
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt')
    return bcrypt.hash(password, 12)
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt')
    return bcrypt.compare(password, hash)
  }
}

// Singleton instance
export const shareGenerator = new ShareGenerator()