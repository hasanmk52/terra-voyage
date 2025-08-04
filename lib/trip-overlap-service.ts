import { db } from './db'
import { TripDateRange, validateTripCreation } from './date-overlap-validation'

/**
 * Service for handling trip date overlap validation with database integration
 */
export class TripOverlapService {
  
  /**
   * Get all active trips for a user within a date range (with buffer)
   */
  static async getUserTripsInRange(
    userId: string, 
    startDate: Date, 
    endDate: Date,
    excludeTripId?: string
  ): Promise<TripDateRange[]> {
    // Add a buffer of 30 days on each side to catch potential overlaps
    const bufferDays = 30
    const bufferedStart = new Date(startDate.getTime() - bufferDays * 24 * 60 * 60 * 1000)
    const bufferedEnd = new Date(endDate.getTime() + bufferDays * 24 * 60 * 60 * 1000)
    
    const trips = await db.trip.findMany({
      where: {
        userId,
        status: {
          in: ['DRAFT', 'PLANNED', 'ACTIVE'] // Only active trips can create conflicts
        },
        ...(excludeTripId && { id: { not: excludeTripId } }),
        OR: [
          // Trip starts within the buffered range
          {
            startDate: {
              gte: bufferedStart,
              lte: bufferedEnd
            }
          },
          // Trip ends within the buffered range  
          {
            endDate: {
              gte: bufferedStart,
              lte: bufferedEnd
            }
          },
          // Trip completely encompasses the buffered range
          {
            AND: [
              { startDate: { lte: bufferedStart } },
              { endDate: { gte: bufferedEnd } }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true,
        userId: true,
        status: true
      }
    })
    
    return trips.map(trip => ({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      userId: trip.userId
    }))
  }
  
  /**
   * Validate a new trip creation for date overlaps
   */
  static async validateNewTrip(tripData: {
    title: string
    destination: string
    startDate: Date
    endDate: Date
    userId: string
  }) {
    try {
      // Get existing trips that might overlap
      const existingTrips = await this.getUserTripsInRange(
        tripData.userId,
        tripData.startDate,
        tripData.endDate
      )
      
      // Ensure existingTrips is an array
      if (!Array.isArray(existingTrips)) {
        console.error('getUserTripsInRange returned non-array:', existingTrips)
        return {
          isValid: false,
          errors: ['Internal error: could not retrieve existing trips']
        }
      }
      
      // Validate using our business rules
      return validateTripCreation(tripData, existingTrips)
    } catch (error) {
      console.error('Error in validateNewTrip:', error)
      return {
        isValid: false,
        errors: ['Internal validation error occurred']
      }
    }
  }
  
  /**
   * Validate trip update for date overlaps
   */
  static async validateTripUpdate(
    tripId: string,
    tripData: {
      title: string
      destination: string
      startDate: Date
      endDate: Date
      userId: string
    }
  ) {
    // Get existing trips excluding the current trip being updated
    const existingTrips = await this.getUserTripsInRange(
      tripData.userId,
      tripData.startDate,
      tripData.endDate,
      tripId
    )
    
    // Validate using our business rules
    return validateTripCreation(tripData, existingTrips)
  }
  
  /**
   * Get detailed overlap information for a trip
   */
  static async getOverlapDetails(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeTripId?: string
  ) {
    const existingTrips = await this.getUserTripsInRange(
      userId,
      startDate,
      endDate,
      excludeTripId
    )
    
    const { validateTripCreation, checkTripDateOverlap } = await import('./date-overlap-validation')
    
    return checkTripDateOverlap(
      { startDate, endDate },
      existingTrips
    )
  }
  
  /**
   * Get all overlapping trips for a user (for dashboard/management)
   */
  static async getAllUserOverlaps(userId: string) {
    const allTrips = await db.trip.findMany({
      where: {
        userId,
        status: {
          in: ['DRAFT', 'PLANNED', 'ACTIVE']
        }
      },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true,
        userId: true,
        status: true
      },
      orderBy: {
        startDate: 'asc'
      }
    })
    
    const overlaps: Array<{
      trip1: TripDateRange
      trip2: TripDateRange
      overlapDays: number
      overlapStart: Date
      overlapEnd: Date
    }> = []
    
    // Check each trip against all others
    for (let i = 0; i < allTrips.length; i++) {
      for (let j = i + 1; j < allTrips.length; j++) {
        const trip1 = allTrips[i]
        const trip2 = allTrips[j]
        
        const { doDateRangesOverlap, calculateOverlapPeriod, calculateOverlapDays } = 
          await import('./date-overlap-validation')
        
        if (doDateRangesOverlap(trip1, trip2)) {
          const overlap = calculateOverlapPeriod(trip1, trip2)
          if (overlap) {
            overlaps.push({
              trip1: {
                id: trip1.id,
                title: trip1.title,
                destination: trip1.destination,
                startDate: trip1.startDate,
                endDate: trip1.endDate,
                userId: trip1.userId
              },
              trip2: {
                id: trip2.id,
                title: trip2.title,
                destination: trip2.destination,
                startDate: trip2.startDate,
                endDate: trip2.endDate,
                userId: trip2.userId
              },
              overlapDays: calculateOverlapDays(trip1, trip2),
              overlapStart: overlap.startDate,
              overlapEnd: overlap.endDate
            })
          }
        }
      }
    }
    
    return overlaps
  }
  
  /**
   * Suggest alternative dates for a trip
   */
  static async suggestAlternativeDates(
    userId: string,
    startDate: Date,
    endDate: Date,
    direction: 'before' | 'after' | 'both' = 'both'
  ) {
    const existingTrips = await this.getUserTripsInRange(
      userId,
      startDate,
      endDate
    )
    
    const { suggestAlternativeDates } = await import('./date-overlap-validation')
    
    return suggestAlternativeDates(
      { startDate, endDate },
      existingTrips,
      direction
    )
  }
  
  /**
   * Check if a user can travel (has no overlapping active trips)
   */
  static async canUserTravel(userId: string, checkDate: Date = new Date()): Promise<{
    canTravel: boolean
    currentTrip?: {
      id: string
      title: string
      destination: string
      startDate: Date
      endDate: Date
    }
  }> {
    const currentTrip = await db.trip.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        startDate: { lte: checkDate },
        endDate: { gte: checkDate }
      },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true
      }
    })
    
    return {
      canTravel: !currentTrip,
      currentTrip: currentTrip || undefined
    }
  }
}