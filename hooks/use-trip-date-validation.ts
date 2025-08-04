import { useState, useCallback } from 'react'

export interface DateValidationResult {
  isValid: boolean
  hasOverlap: boolean
  errors: string[]
  overlappingTrips?: Array<{
    id: string
    title: string
    destination: string
    startDate: Date
    endDate: Date
  }>
  overlapDetails?: Array<{
    tripId: string
    tripTitle: string
    destination: string
    overlapStart: Date
    overlapEnd: Date
    overlapDays: number
  }>
  suggestedDates?: Array<{
    startDate: Date
    endDate: Date
    duration: number
  }>
  message?: string
}

export interface UseTripDateValidationOptions {
  userId?: string
  excludeTripId?: string
  debounceMs?: number
}

export function useTripDateValidation(options: UseTripDateValidationOptions = {}) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<DateValidationResult | null>(null)
  const [lastValidatedDates, setLastValidatedDates] = useState<{
    startDate: string
    endDate: string
  } | null>(null)

  const validateDates = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<DateValidationResult> => {
    setIsValidating(true)
    
    try {
      const startISOString = startDate.toISOString()
      const endISOString = endDate.toISOString()
      
      // Don't validate if dates haven't changed
      if (
        lastValidatedDates?.startDate === startISOString &&
        lastValidatedDates?.endDate === endISOString &&
        validationResult
      ) {
        setIsValidating(false)
        return validationResult
      }

      const response = await fetch('/api/user/trips/validate-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startISOString,
          endDate: endISOString,
          userId: options.userId,
          excludeTripId: options.excludeTripId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      // Convert date strings back to Date objects
      const result: DateValidationResult = {
        ...data,
        overlappingTrips: data.overlappingTrips?.map((trip: any) => ({
          ...trip,
          startDate: new Date(trip.startDate),
          endDate: new Date(trip.endDate)
        })),
        overlapDetails: data.overlapDetails?.map((detail: any) => ({
          ...detail,
          overlapStart: new Date(detail.overlapStart),
          overlapEnd: new Date(detail.overlapEnd)
        })),
        suggestedDates: data.suggestedDates?.map((suggestion: any) => ({
          ...suggestion,
          startDate: new Date(suggestion.startDate),
          endDate: new Date(suggestion.endDate)
        }))
      }

      setValidationResult(result)
      setLastValidatedDates({
        startDate: startISOString,
        endDate: endISOString
      })

      return result

    } catch (error) {
      console.error('Date validation error:', error)
      const errorResult: DateValidationResult = {
        isValid: false,
        hasOverlap: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      }
      setValidationResult(errorResult)
      return errorResult
    } finally {
      setIsValidating(false)
    }
  }, [options.userId, options.excludeTripId, lastValidatedDates, validationResult])

  const clearValidation = useCallback(() => {
    setValidationResult(null)
    setLastValidatedDates(null)
  }, [])

  return {
    validateDates,
    isValidating,
    validationResult,
    clearValidation,
    hasValidationErrors: validationResult && !validationResult.isValid
  }
}