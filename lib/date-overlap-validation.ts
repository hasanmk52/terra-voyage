import { z } from 'zod'

// Types for date overlap validation
export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface TripDateRange extends DateRange {
  id: string
  title: string
  destination: string
  userId: string
}

export interface DateOverlapResult {
  hasOverlap: boolean
  overlappingTrips: TripDateRange[]
  overlapDetails: OverlapDetail[]
}

export interface OverlapDetail {
  tripId: string
  tripTitle: string
  destination: string
  overlapStart: Date
  overlapEnd: Date
  overlapDays: number
}

// Validation schemas
export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.startDate < data.endDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
)

export const tripCreationSchema = z.object({
  title: z.string().min(1, "Trip title is required").max(100, "Trip title too long"),
  destination: z.string().min(1, "Destination is required").max(100, "Destination name too long"),
  startDate: z.date(),
  endDate: z.date(),
  userId: z.string().min(1, "User ID is required"),
}).refine(
  (data) => data.startDate < data.endDate,
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
).refine(
  (data) => data.startDate >= new Date(new Date().setHours(0, 0, 0, 0)),
  {
    message: "Trip cannot start in the past. Please select today or a future date.",
    path: ["startDate"],
  }
).refine(
  (data) => {
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2)
    return data.endDate <= maxFutureDate
  },
  {
    message: "Trip cannot be planned more than 2 years in advance",
    path: ["endDate"],
  }
)

/**
 * Check if two date ranges overlap
 */
export function doDateRangesOverlap(range1: DateRange, range2: DateRange): boolean {
  // Convert to timestamps for accurate comparison
  const start1 = range1.startDate.getTime()
  const end1 = range1.endDate.getTime()
  const start2 = range2.startDate.getTime()
  const end2 = range2.endDate.getTime()

  // Two ranges overlap if:
  // - range1 starts before range2 ends AND range2 starts before range1 ends
  return start1 < end2 && start2 < end1
}

/**
 * Calculate the overlap period between two date ranges
 */
export function calculateOverlapPeriod(range1: DateRange, range2: DateRange): DateRange | null {
  if (!doDateRangesOverlap(range1, range2)) {
    return null
  }

  const overlapStart = new Date(Math.max(range1.startDate.getTime(), range2.startDate.getTime()))
  const overlapEnd = new Date(Math.min(range1.endDate.getTime(), range2.endDate.getTime()))

  return {
    startDate: overlapStart,
    endDate: overlapEnd
  }
}

/**
 * Calculate the number of overlapping days between two date ranges
 */
export function calculateOverlapDays(range1: DateRange, range2: DateRange): number {
  const overlap = calculateOverlapPeriod(range1, range2)
  if (!overlap) return 0

  const diffTime = overlap.endDate.getTime() - overlap.startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Check for overlaps between a proposed trip and existing trips
 */
export function checkTripDateOverlap(
  proposedTrip: DateRange,
  existingTrips: TripDateRange[]
): DateOverlapResult {
  const overlappingTrips: TripDateRange[] = []
  const overlapDetails: OverlapDetail[] = []

  for (const existingTrip of existingTrips) {
    if (doDateRangesOverlap(proposedTrip, existingTrip)) {
      overlappingTrips.push(existingTrip)
      
      const overlap = calculateOverlapPeriod(proposedTrip, existingTrip)
      if (overlap) {
        overlapDetails.push({
          tripId: existingTrip.id,
          tripTitle: existingTrip.title,
          destination: existingTrip.destination,
          overlapStart: overlap.startDate,
          overlapEnd: overlap.endDate,
          overlapDays: calculateOverlapDays(proposedTrip, existingTrip)
        })
      }
    }
  }

  return {
    hasOverlap: overlappingTrips.length > 0,
    overlappingTrips,
    overlapDetails
  }
}

/**
 * Format overlap details for user-friendly error messages
 */
export function formatOverlapError(overlapResult: DateOverlapResult): string {
  if (!overlapResult.hasOverlap) {
    return ""
  }

  const details = overlapResult.overlapDetails
  if (details.length === 1) {
    const detail = details[0]
    const overlapDaysText = detail.overlapDays === 1 ? '1 day' : `${detail.overlapDays} days`
    const dateRange = `${detail.overlapStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${detail.overlapEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    return `Your trip dates overlap with "${detail.tripTitle}" (to ${detail.destination}) by ${overlapDaysText} (${dateRange}). Please choose different dates or modify your existing trip.`
  }

  const tripCount = details.length
  const totalOverlapDays = details.reduce((sum, detail) => sum + detail.overlapDays, 0)
  const tripsList = details.map(d => `"${d.tripTitle}" (to ${d.destination})`).join(', ')
  const overlapDaysText = totalOverlapDays === 1 ? '1 day' : `${totalOverlapDays} days`

  return `Your trip dates overlap with ${tripCount} existing trips by ${overlapDaysText}:\n${tripsList}\n\nPlease choose different dates or modify your existing trips.`
}

/**
 * Generate suggested alternative dates
 */
export function suggestAlternativeDates(
  proposedTrip: DateRange,
  existingTrips: TripDateRange[],
  direction: 'before' | 'after' | 'both' = 'both'
): DateRange[] {
  const suggestions: DateRange[] = []
  const tripDurationMs = proposedTrip.endDate.getTime() - proposedTrip.startDate.getTime()
  
  // Sort existing trips by start date
  const sortedTrips = [...existingTrips].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  
  if (direction === 'before' || direction === 'both') {
    // Try to place the trip before the earliest conflicting trip
    const earliestConflict = sortedTrips.find(trip => 
      doDateRangesOverlap(proposedTrip, trip)
    )
    
    if (earliestConflict) {
      const suggestedEndDate = new Date(earliestConflict.startDate.getTime() - 24 * 60 * 60 * 1000) // 1 day before
      const suggestedStartDate = new Date(suggestedEndDate.getTime() - tripDurationMs)
      
      // Make sure it's not in the past
      if (suggestedStartDate >= new Date()) {
        suggestions.push({
          startDate: suggestedStartDate,
          endDate: suggestedEndDate
        })
      }
    }
  }
  
  if (direction === 'after' || direction === 'both') {
    // Try to place the trip after the latest conflicting trip
    const latestConflict = sortedTrips
      .filter(trip => doDateRangesOverlap(proposedTrip, trip))
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]
    
    if (latestConflict) {
      const suggestedStartDate = new Date(latestConflict.endDate.getTime() + 24 * 60 * 60 * 1000) // 1 day after
      const suggestedEndDate = new Date(suggestedStartDate.getTime() + tripDurationMs)
      
      // Make sure it's not too far in the future (within 2 years)
      const maxDate = new Date()
      maxDate.setFullYear(maxDate.getFullYear() + 2)
      
      if (suggestedEndDate <= maxDate) {
        suggestions.push({
          startDate: suggestedStartDate,
          endDate: suggestedEndDate
        })
      }
    }
  }
  
  return suggestions.slice(0, 3) // Limit to 3 suggestions
}

/**
 * Validate trip creation business rules
 */
export function validateTripCreation(
  tripData: {
    title: string
    destination: string
    startDate: Date
    endDate: Date
    userId: string
  },
  existingTrips: TripDateRange[]
): {
  isValid: boolean
  errors: string[]
  overlapResult?: DateOverlapResult
  suggestions?: DateRange[]
} {
  const errors: string[] = []

  // Validate basic schema
  const schemaResult = tripCreationSchema.safeParse(tripData)
  if (!schemaResult.success && schemaResult.error) {
    errors.push(...schemaResult.error.issues.map(e => e.message))
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors }
  }
  
  // Check for date overlaps
  const overlapResult = checkTripDateOverlap(
    { startDate: tripData.startDate, endDate: tripData.endDate },
    existingTrips.filter(trip => trip.userId === tripData.userId) // Only check user's own trips
  )
  
  if (overlapResult.hasOverlap) {
    errors.push(formatOverlapError(overlapResult))
    
    const suggestions = suggestAlternativeDates(
      { startDate: tripData.startDate, endDate: tripData.endDate },
      existingTrips.filter(trip => trip.userId === tripData.userId)
    )
    
    return {
      isValid: false,
      errors,
      overlapResult,
      suggestions
    }
  }
  
  return { isValid: true, errors: [] }
}