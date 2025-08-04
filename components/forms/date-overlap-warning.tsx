"use client"

import React from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DateValidationResult } from '@/hooks/use-trip-date-validation'

interface DateOverlapWarningProps {
  validationResult: DateValidationResult
  onSelectSuggestedDate?: (startDate: Date, endDate: Date) => void
  className?: string
}

export function DateOverlapWarning({ 
  validationResult, 
  onSelectSuggestedDate,
  className 
}: DateOverlapWarningProps) {
  if (validationResult.isValid) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className || ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-green-800">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">
              {validationResult.message || "Dates are available for booking"}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!validationResult.hasOverlap) {
    // Basic validation errors (date format, end before start, etc.)
    return (
      <Card className={`border-red-200 bg-red-50 ${className || ''}`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">Invalid Dates</div>
              <ul className="text-sm space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Date overlap warning with detailed information
  return (
    <Card className={`border-amber-200 bg-amber-50 ${className || ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-900 text-base">
          <AlertTriangle className="h-5 w-5" />
          Date Conflict Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Summary */}
        <div className="text-amber-800 text-sm">
          {validationResult.errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>

        {/* Overlapping Trips Details */}
        {validationResult.overlappingTrips && validationResult.overlappingTrips.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-amber-900 text-sm">Conflicting Trips:</h4>
            <div className="space-y-2">
              {validationResult.overlappingTrips.map((trip, index) => {
                const overlapDetail = validationResult.overlapDetails?.find(d => d.tripId === trip.id)
                return (
                  <div key={trip.id} className="bg-white rounded-md p-3 border border-amber-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 text-sm">{trip.title}</h5>
                        <div className="flex items-center gap-1 text-gray-600 text-xs mt-1">
                          <MapPin className="h-3 w-3" />
                          {trip.destination}
                        </div>
                      </div>
                      {overlapDetail && (
                        <Badge variant="secondary" className="text-xs">
                          {overlapDetail.overlapDays} day{overlapDetail.overlapDays > 1 ? 's' : ''} overlap
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(trip.startDate, 'MMM d, yyyy')} - {format(trip.endDate, 'MMM d, yyyy')}
                      </span>
                      {overlapDetail && (
                        <>
                          <span className="text-amber-600">•</span>
                          <span className="text-amber-600">
                            Overlap: {format(overlapDetail.overlapStart, 'MMM d')} - {format(overlapDetail.overlapEnd, 'MMM d')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Suggested Alternative Dates */}
        {validationResult.suggestedDates && validationResult.suggestedDates.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-amber-900 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Suggested Alternative Dates:
            </h4>
            <div className="space-y-2">
              {validationResult.suggestedDates.map((suggestion, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-md p-3 border border-amber-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {format(suggestion.startDate, 'MMM d, yyyy')} - {format(suggestion.endDate, 'MMM d, yyyy')}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {suggestion.duration} day{suggestion.duration > 1 ? 's' : ''} trip
                      </div>
                    </div>
                  </div>
                  
                  {onSelectSuggestedDate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectSuggestedDate(suggestion.startDate, suggestion.endDate)}
                      className="text-xs"
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Use These Dates
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-amber-700 bg-amber-100 rounded-md p-2">
          💡 <strong>Tip:</strong> You can only have one active trip at a time. Consider completing or canceling conflicting trips, or choose alternative dates.
        </div>
      </CardContent>
    </Card>
  )
}