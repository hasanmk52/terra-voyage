/**
 * Retry Progress Component
 * Displays retry progress with attempt count, progress bar, and cancellation option
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  RefreshCw, 
  X, 
  Clock, 
  AlertTriangle,
  CheckCircle 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RetryProgressProps {
  isRetrying: boolean
  currentAttempt: number
  maxAttempts: number
  nextRetryDelay?: number
  error?: string | null
  canCancel?: boolean
  onCancel?: () => void
  className?: string
  showDetails?: boolean
  estimatedCompletion?: number
}

export function RetryProgress({
  isRetrying,
  currentAttempt,
  maxAttempts,
  nextRetryDelay,
  error,
  canCancel = true,
  onCancel,
  className,
  showDetails = true,
  estimatedCompletion
}: RetryProgressProps) {
  const progressPercentage = Math.round((currentAttempt / maxAttempts) * 100)
  const timeRemaining = estimatedCompletion ? Math.max(0, estimatedCompletion - Date.now()) : null
  
  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusIcon = () => {
    if (error) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (isRetrying) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (currentAttempt === maxAttempts) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <Clock className="h-4 w-4 text-yellow-500" />
  }

  const getStatusMessage = () => {
    if (error) {
      return error
    }
    if (isRetrying) {
      return `Retrying... Attempt ${currentAttempt} of ${maxAttempts}`
    }
    return `Attempting ${currentAttempt} of ${maxAttempts}...`
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with status icon and message */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                {isRetrying ? 'Retrying...' : error ? 'Failed' : 'Processing'}
              </span>
            </div>
            
            {canCancel && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-6 w-6 p-0"
                disabled={!isRetrying}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Cancel</span>
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress 
              value={progressPercentage} 
              className="h-2"
              indicatorClassName={cn(
                "transition-all duration-300",
                error ? "bg-red-500" : "bg-blue-500"
              )}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Attempt {currentAttempt} of {maxAttempts}</span>
              <span>{progressPercentage}%</span>
            </div>
          </div>

          {/* Status message */}
          <p className={cn(
            "text-sm",
            error ? "text-red-600" : "text-gray-600"
          )}>
            {getStatusMessage()}
          </p>

          {/* Detailed information */}
          {showDetails && (
            <div className="space-y-2 text-xs text-gray-500">
              {isRetrying && nextRetryDelay && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Next retry in {formatTime(nextRetryDelay)}</span>
                </div>
              )}
              
              {timeRemaining && timeRemaining > 0 && (
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Est. completion in {formatTime(timeRemaining)}</span>
                </div>
              )}
              
              {error && (
                <div className="text-xs text-red-500 bg-red-50 p-2 rounded border">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>
          )}

          {/* Cancel button (if enabled and retrying) */}
          {canCancel && onCancel && isRetrying && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="w-full"
            >
              Cancel Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for inline display
export function RetryProgressInline({
  isRetrying,
  currentAttempt,
  maxAttempts,
  error,
  canCancel = true,
  onCancel,
  className
}: Omit<RetryProgressProps, 'showDetails'>) {
  return (
    <div className={cn("flex items-center gap-2 p-2 bg-gray-50 rounded", className)}>
      {isRetrying ? (
        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      ) : error ? (
        <AlertTriangle className="h-4 w-4 text-red-500" />
      ) : (
        <Clock className="h-4 w-4 text-yellow-500" />
      )}
      
      <span className="text-sm text-gray-600 flex-1">
        {error || `Attempt ${currentAttempt}/${maxAttempts}...`}
      </span>
      
      {canCancel && onCancel && isRetrying && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}