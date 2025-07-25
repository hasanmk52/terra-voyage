import { PrismaClient, NotificationType } from '@prisma/client'
import { VoteData, ActivityVotes, getVoteConsensus } from './collaboration-types'

const prisma = new PrismaClient()

export class VotingService {
  
  // Cast or update vote for an activity
  async castVote(userId: string, activityId: string, value: number): Promise<VoteData> {
    // Verify user has access to the trip containing this activity
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        trip: {
          include: {
            collaborations: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!activity) {
      throw new Error('Activity not found')
    }

    // Check if user has access (is owner or collaborator)
    const hasAccess = activity.trip.userId === userId || 
                     activity.trip.collaborations.length > 0

    if (!hasAccess) {
      throw new Error('Access denied')
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Upsert vote
    const vote = await prisma.vote.upsert({
      where: {
        userId_activityId: {
          userId,
          activityId
        }
      },
      update: {
        value,
        updatedAt: new Date()
      },
      create: {
        userId,
        activityId,
        value
      }
    })

    // Create notification for trip owner if different from voter
    if (activity.trip.userId !== userId) {
      await prisma.notification.create({
        data: {
          userId: activity.trip.userId,
          tripId: activity.tripId,
          type: NotificationType.VOTE_ADDED,
          title: 'New vote on activity',
          message: `${user.name || 'Someone'} voted on "${activity.name}"`,
          data: {
            activityId,
            activityName: activity.name,
            voterName: user.name,
            vote: value
          }
        }
      })
    }

    return {
      id: vote.id,
      userId: vote.userId,
      userName: user.name,
      userImage: user.image,
      value: vote.value,
      createdAt: vote.createdAt
    }
  }

  // Get all votes for an activity
  async getActivityVotes(activityId: string, requesterId: string): Promise<ActivityVotes> {
    // Verify access
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        trip: {
          include: {
            collaborations: {
              where: { userId: requesterId }
            }
          }
        },
        votes: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          }
        }
      }
    })

    if (!activity) {
      throw new Error('Activity not found')
    }

    const hasAccess = activity.trip.userId === requesterId || 
                     activity.trip.collaborations.length > 0

    if (!hasAccess) {
      throw new Error('Access denied')
    }

    // Transform votes
    const votes: VoteData[] = activity.votes.map(vote => ({
      id: vote.id,
      userId: vote.userId,
      userName: vote.user.name,
      userImage: vote.user.image,
      value: vote.value,
      createdAt: vote.createdAt
    }))

    const userVote = votes.find(v => v.userId === requesterId)
    const totalVotes = votes.filter(v => v.value !== 0).length
    const consensus = getVoteConsensus(votes)

    return {
      activityId,
      votes,
      totalVotes,
      userVote,
      consensus
    }
  }

  // Get votes for all activities in a trip
  async getTripVotes(tripId: string, requesterId: string): Promise<Record<string, ActivityVotes>> {
    // Verify access
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId: requesterId },
          { collaborations: { some: { userId: requesterId } } }
        ]
      },
      include: {
        activities: {
          include: {
            votes: {
              include: {
                user: {
                  select: { id: true, name: true, image: true }
                }
              }
            }
          }
        }
      }
    })

    if (!trip) {
      throw new Error('Trip not found or access denied')
    }

    const tripVotes: Record<string, ActivityVotes> = {}

    for (const activity of trip.activities) {
      const votes: VoteData[] = activity.votes.map(vote => ({
        id: vote.id,
        userId: vote.userId,
        userName: vote.user.name,
        userImage: vote.user.image,
        value: vote.value,
        createdAt: vote.createdAt
      }))

      const userVote = votes.find(v => v.userId === requesterId)
      const totalVotes = votes.filter(v => v.value !== 0).length
      const consensus = getVoteConsensus(votes)

      tripVotes[activity.id] = {
        activityId: activity.id,
        votes,
        totalVotes,
        userVote,
        consensus
      }
    }

    return tripVotes
  }

  // Get vote summary for trip dashboard
  async getTripVoteSummary(tripId: string, requesterId: string) {
    const tripVotes = await this.getTripVotes(tripId, requesterId)
    
    const summary = {
      totalActivities: Object.keys(tripVotes).length,
      activitiesWithVotes: 0,
      consensusBreakdown: {
        positive: 0,
        negative: 0,
        mixed: 0,
        neutral: 0
      },
      topRatedActivities: [] as { activityId: string; score: number }[],
      controversialActivities: [] as { activityId: string; score: number }[]
    }

    for (const [activityId, votes] of Object.entries(tripVotes)) {
      if (votes.totalVotes > 0) {
        summary.activitiesWithVotes++
        summary.consensusBreakdown[votes.consensus]++

        // Calculate average score
        const totalScore = votes.votes.reduce((sum, vote) => sum + vote.value, 0)
        const avgScore = totalScore / votes.votes.length

        // Track top-rated (positive consensus with high score)
        if (votes.consensus === 'positive') {
          summary.topRatedActivities.push({ activityId, score: avgScore })
        }

        // Track controversial (mixed consensus)
        if (votes.consensus === 'mixed') {
          summary.controversialActivities.push({ activityId, score: Math.abs(avgScore) })
        }
      }
    }

    // Sort by score
    summary.topRatedActivities.sort((a, b) => b.score - a.score)
    summary.controversialActivities.sort((a, b) => b.score - a.score)

    // Limit to top 5
    summary.topRatedActivities = summary.topRatedActivities.slice(0, 5)
    summary.controversialActivities = summary.controversialActivities.slice(0, 5)

    return summary
  }

  // Remove vote
  async removeVote(userId: string, activityId: string): Promise<boolean> {
    const deleted = await prisma.vote.deleteMany({
      where: {
        userId,
        activityId
      }
    })

    return deleted.count > 0
  }

  // Get voting statistics for analytics
  async getVotingStats(tripId: string): Promise<{
    totalVotes: number
    uniqueVoters: number
    averageParticipation: number
    consensusRate: number
  }> {
    const votes = await prisma.vote.findMany({
      where: {
        activity: {
          tripId
        }
      },
      include: {
        activity: true
      }
    })

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        activities: true,
        collaborations: true
      }
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    const totalVotes = votes.length
    const uniqueVoters = new Set(votes.map(v => v.userId)).size
    const totalMembers = trip.collaborations.length + 1 // +1 for owner
    const totalActivities = trip.activities.length

    // Calculate average participation rate
    const averageParticipation = totalMembers > 0 
      ? (uniqueVoters / totalMembers) * 100 
      : 0

    // Calculate consensus rate (activities with clear positive/negative consensus)
    const activitiesWithConsensus = trip.activities.filter(activity => {
      const activityVotes = votes.filter(v => v.activityId === activity.id)
      const consensus = getVoteConsensus(activityVotes.map(v => ({
        id: v.id,
        userId: v.userId,
        userName: null,
        userImage: null,
        value: v.value,
        createdAt: v.createdAt
      })))
      return consensus === 'positive' || consensus === 'negative'
    }).length

    const consensusRate = totalActivities > 0 
      ? (activitiesWithConsensus / totalActivities) * 100 
      : 0

    return {
      totalVotes,
      uniqueVoters,
      averageParticipation,
      consensusRate
    }
  }
}

export const votingService = new VotingService()