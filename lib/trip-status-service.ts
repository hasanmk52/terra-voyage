import { db } from './db'
import { TripStatus } from '@prisma/client'

export interface StatusTransitionResult {
  success: boolean
  oldStatus: TripStatus
  newStatus: TripStatus
  reason: string
  metadata?: Record<string, any>
  error?: string
}

export interface StatusValidationResult {
  isValid: boolean
  error?: string
  allowedTransitions?: TripStatus[]
}

export class TripStatusService {
  // Define valid status transitions
  private static readonly VALID_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
    DRAFT: ['PLANNED', 'CANCELLED'],
    PLANNED: ['ACTIVE', 'CANCELLED', 'DRAFT'], // Can go back to DRAFT for edits
    ACTIVE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: ['ACTIVE'], // Can reactivate if needed
    CANCELLED: ['DRAFT', 'PLANNED'] // Can restore cancelled trips
  }

  // Define automatic transition conditions
  private static readonly AUTO_TRANSITION_RULES = {
    // DRAFT → PLANNED: After successful itinerary generation
    DRAFT_TO_PLANNED: (tripData: any) => {
      return tripData.hasItinerary && tripData.activities?.length > 0
    },
    
    // PLANNED → ACTIVE: On or after start date
    PLANNED_TO_ACTIVE: (tripData: any) => {
      const now = new Date()
      const startDate = new Date(tripData.startDate)
      return now >= startDate
    },
    
    // ACTIVE → COMPLETED: After end date
    ACTIVE_TO_COMPLETED: (tripData: any) => {
      const now = new Date()
      const endDate = new Date(tripData.endDate)
      return now > endDate
    }
  }

  /**
   * Validate if a status transition is allowed
   */
  static validateTransition(currentStatus: TripStatus, newStatus: TripStatus): StatusValidationResult {
    const allowedTransitions = this.VALID_TRANSITIONS[currentStatus] || []
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        isValid: false,
        error: `Cannot transition from ${currentStatus} to ${newStatus}`,
        allowedTransitions
      }
    }

    return { isValid: true, allowedTransitions }
  }

  /**
   * Automatically transition trip status based on events
   */
  static async autoTransitionStatus(
    tripId: string, 
    reason: 'itinerary_generated' | 'date_based' | 'system_check',
    metadata?: Record<string, any>
  ): Promise<StatusTransitionResult> {
    try {
      // Get current trip data with related information
      const trip = await db.trip.findUnique({
        where: { id: tripId },
        include: {
          activities: true,
          itineraryData: true,
          _count: {
            select: {
              activities: true,
              days: true
            }
          }
        }
      })

      if (!trip) {
        return {
          success: false,
          oldStatus: 'DRAFT' as TripStatus,
          newStatus: 'DRAFT' as TripStatus,
          reason,
          error: 'Trip not found'
        }
      }

      let newStatus: TripStatus | null = null
      const currentStatus = trip.status

      // Determine new status based on current status and conditions
      switch (currentStatus) {
        case 'DRAFT':
          if (reason === 'itinerary_generated' && this.AUTO_TRANSITION_RULES.DRAFT_TO_PLANNED({
            hasItinerary: !!trip.itineraryData,
            activities: trip.activities
          })) {
            newStatus = 'PLANNED'
          }
          break

        case 'PLANNED':
          if (reason === 'date_based' && this.AUTO_TRANSITION_RULES.PLANNED_TO_ACTIVE({
            startDate: trip.startDate
          })) {
            newStatus = 'ACTIVE'
          }
          break

        case 'ACTIVE':
          if (reason === 'date_based' && this.AUTO_TRANSITION_RULES.ACTIVE_TO_COMPLETED({
            endDate: trip.endDate
          })) {
            newStatus = 'COMPLETED'
          }
          break

        case 'COMPLETED':
        case 'CANCELLED':
          // These statuses don't auto-transition
          break
      }

      // If no transition needed, return current status
      if (!newStatus || newStatus === currentStatus) {
        return {
          success: true,
          oldStatus: currentStatus,
          newStatus: currentStatus,
          reason: 'no_transition_needed',
          metadata
        }
      }

      // Validate the transition
      const validation = this.validateTransition(currentStatus, newStatus)
      if (!validation.isValid) {
        return {
          success: false,
          oldStatus: currentStatus,
          newStatus,
          reason,
          error: validation.error,
          metadata
        }
      }

      // Perform the status transition
      return await this.transitionStatus(tripId, newStatus, 'system', reason, metadata)

    } catch (error) {
      console.error('Error in auto status transition:', error)
      return {
        success: false,
        oldStatus: 'DRAFT' as TripStatus,
        newStatus: 'DRAFT' as TripStatus,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata
      }
    }
  }

  /**
   * Manually transition trip status
   */
  static async manualTransitionStatus(
    tripId: string,
    newStatus: TripStatus,
    userId?: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<StatusTransitionResult> {
    try {
      const trip = await db.trip.findUnique({
        where: { id: tripId },
        select: { status: true }
      })

      if (!trip) {
        return {
          success: false,
          oldStatus: 'DRAFT' as TripStatus,
          newStatus,
          reason: reason || 'manual',
          error: 'Trip not found'
        }
      }

      // Validate the transition
      const validation = this.validateTransition(trip.status, newStatus)
      if (!validation.isValid) {
        return {
          success: false,
          oldStatus: trip.status,
          newStatus,
          reason: reason || 'manual',
          error: validation.error,
          metadata
        }
      }

      return await this.transitionStatus(tripId, newStatus, userId, reason || 'manual', metadata)

    } catch (error) {
      console.error('Error in manual status transition:', error)
      return {
        success: false,
        oldStatus: 'DRAFT' as TripStatus,
        newStatus,
        reason: reason || 'manual',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Internal method to perform the actual status transition
   */
  private static async transitionStatus(
    tripId: string,
    newStatus: TripStatus,
    userId?: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<StatusTransitionResult> {
    return await db.$transaction(async (tx) => {
      // Get current trip status
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: { status: true }
      })

      if (!trip) {
        throw new Error('Trip not found')
      }

      const oldStatus = trip.status

      // Update trip status
      await tx.trip.update({
        where: { id: tripId },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      })

      // Record status history
      await tx.statusHistory.create({
        data: {
          tripId,
          oldStatus,
          newStatus,
          reason: reason || 'unknown',
          userId: userId === 'system' ? null : userId,
          metadata: metadata || {},
          timestamp: new Date()
        }
      })

      return {
        success: true,
        oldStatus,
        newStatus,
        reason: reason || 'unknown',
        metadata
      }
    })
  }

  /**
   * Get allowed transitions for a trip
   */
  static getAllowedTransitions(currentStatus: TripStatus): TripStatus[] {
    return this.VALID_TRANSITIONS[currentStatus] || []
  }

  /**
   * Check if specific transition is allowed
   */
  static isTransitionAllowed(currentStatus: TripStatus, newStatus: TripStatus): boolean {
    return this.getAllowedTransitions(currentStatus).includes(newStatus)
  }

  /**
   * Get user-friendly status descriptions
   */
  static getStatusDescription(status: TripStatus): { label: string; description: string; color: string } {
    const statusInfo = {
      DRAFT: {
        label: 'Draft',
        description: 'Trip is being planned and not yet finalized',
        color: 'bg-gray-100 text-gray-800'
      },
      PLANNED: {
        label: 'Planned',
        description: 'Trip is planned with itinerary and ready to go',
        color: 'bg-blue-100 text-blue-800'
      },
      ACTIVE: {
        label: 'Active',
        description: 'Trip is currently in progress',
        color: 'bg-green-100 text-green-800'
      },
      COMPLETED: {
        label: 'Completed',
        description: 'Trip has been completed successfully',
        color: 'bg-gray-100 text-gray-800'
      },
      CANCELLED: {
        label: 'Cancelled',
        description: 'Trip has been cancelled',
        color: 'bg-red-100 text-red-800'
      }
    }

    return statusInfo[status] || statusInfo.DRAFT
  }

  /**
   * Run background checks for date-based status transitions
   */
  static async runDateBasedStatusChecks(): Promise<{
    processed: number
    transitions: StatusTransitionResult[]
    errors: string[]
  }> {
    const results = {
      processed: 0,
      transitions: [] as StatusTransitionResult[],
      errors: [] as string[]
    }

    try {
      const now = new Date()
      
      // Find trips that might need status transitions
      const tripsToCheck = await db.trip.findMany({
        where: {
          OR: [
            // PLANNED trips that should be ACTIVE (start date has passed)
            {
              status: 'PLANNED',
              startDate: {
                lte: now
              }
            },
            // ACTIVE trips that should be COMPLETED (end date has passed)
            {
              status: 'ACTIVE',
              endDate: {
                lt: now
              }
            }
          ]
        },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true
        }
      })

      results.processed = tripsToCheck.length

      // Process each trip
      for (const trip of tripsToCheck) {
        try {
          const transitionResult = await this.autoTransitionStatus(
            trip.id,
            'date_based',
            {
              checkTime: now.toISOString(),
              originalStatus: trip.status,
              startDate: trip.startDate.toISOString(),
              endDate: trip.endDate.toISOString()
            }
          )

          results.transitions.push(transitionResult)

          if (!transitionResult.success) {
            results.errors.push(`Trip ${trip.id}: ${transitionResult.error}`)
          }
        } catch (error) {
          const errorMsg = `Trip ${trip.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          results.errors.push(errorMsg)
          console.error('Error processing trip status check:', errorMsg)
        }
      }

      return results
    } catch (error) {
      console.error('Error in runDateBasedStatusChecks:', error)
      results.errors.push(error instanceof Error ? error.message : 'Unknown error')
      return results
    }
  }

  /**
   * Get trip status statistics
   */
  static async getStatusStatistics(): Promise<Record<TripStatus, number>> {
    const stats = await db.trip.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const result = {} as Record<TripStatus, number>
    
    // Initialize all statuses with 0
    Object.keys(this.VALID_TRANSITIONS).forEach(status => {
      result[status as TripStatus] = 0
    })

    // Fill in actual counts
    stats.forEach(stat => {
      result[stat.status] = stat._count.status
    })

    return result
  }
}

export default TripStatusService