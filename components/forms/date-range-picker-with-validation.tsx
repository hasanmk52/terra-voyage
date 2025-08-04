"use client"

import { useState, useEffect, useCallback } from "react"
import { DateRangePicker } from "./date-range-picker"
import { DateOverlapWarning } from "./date-overlap-warning"
import { useTripDateValidation } from "@/hooks/use-trip-date-validation"
import { useDebounce } from "@/hooks/use-debounce"

interface DateRangePickerWithValidationProps {
  startDate?: Date
  endDate?: Date
  onChange: (startDate: Date | undefined, endDate: Date | undefined) => void
  onValidationChange?: (isValid: boolean) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  minDays?: number
  maxDays?: number
  userId?: string
  excludeTripId?: string // For editing existing trips
}

export function DateRangePickerWithValidation({
  startDate,
  endDate,
  onChange,
  onValidationChange,
  userId,
  excludeTripId,
  ...pickerProps
}: DateRangePickerWithValidationProps) {
  const [localError, setLocalError] = useState<string>("")
  
  // Debounce the dates to avoid excessive API calls
  const debouncedStartDate = useDebounce(startDate, 500)
  const debouncedEndDate = useDebounce(endDate, 500)
  
  const { validateDates, isValidating, validationResult, clearValidation } = useTripDateValidation({
    userId,
    excludeTripId
  })

  // Validate dates when they change
  useEffect(() => {
    if (debouncedStartDate && debouncedEndDate) {
      // Basic validation first
      if (debouncedEndDate <= debouncedStartDate) {
        setLocalError("End date must be after start date")
        onValidationChange?.(false)
        return
      }
      
      // Clear local error and validate with API
      setLocalError("")
      validateDates(debouncedStartDate, debouncedEndDate)
        .then((result) => {
          onValidationChange?.(result.isValid)
        })
        .catch((error) => {
          console.error('Validation error:', error)
          onValidationChange?.(false)
        })
    } else {
      // Clear validation when dates are not set
      clearValidation()
      setLocalError("")
      onValidationChange?.(true) // Consider empty dates as valid
    }
  }, [debouncedStartDate, debouncedEndDate, validateDates, clearValidation, onValidationChange])

  const handleSuggestedDateSelect = useCallback((suggestedStart: Date, suggestedEnd: Date) => {
    onChange(suggestedStart, suggestedEnd)
  }, [onChange])

  // Determine if we should show error state
  const hasError = Boolean(localError || (validationResult && !validationResult.isValid))
  const errorMessage = localError || (validationResult?.errors?.[0])

  return (
    <div className="space-y-3">
      <DateRangePicker
        {...pickerProps}
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        error={hasError}
        errorMessage={errorMessage}
        disabled={pickerProps.disabled || isValidating}
      />
      
      {/* Loading indicator */}
      {isValidating && startDate && endDate && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          Checking date availability...
        </div>
      )}
      
      {/* Show validation results */}
      {validationResult && !isValidating && startDate && endDate && (
        <DateOverlapWarning
          validationResult={validationResult}
          onSelectSuggestedDate={handleSuggestedDateSelect}
        />
      )}
      
      {/* Show local error */}
      {localError && !validationResult && (
        <div className="text-red-600 text-sm">
          {localError}
        </div>
      )}
    </div>
  )
}