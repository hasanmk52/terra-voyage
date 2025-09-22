/**
 * Enhanced Trip Generation Component with Retry Logic
 * Implements US-003 retry requirements with progress communication and cancellation
 */

"use client"

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RetryProgress } from '@/components/ui/retry-progress'
import { useRetryProgress, useRetryErrorHandler } from '@/hooks/use-retry-progress'
import { Sparkles, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface TripGenerationData {
  tripId: string
  destination: string
  [key: string]: any
}

interface RetryEnabledGenerationProps {
  tripData: TripGenerationData
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
  className?: string
  autoStart?: boolean
}

export function RetryEnabledGeneration({
  tripData,
  onSuccess,
  onError,
  className,
  autoStart = false
}: RetryEnabledGenerationProps) {
  const [generationState, setGenerationState] = useState<
    'idle' | 'generating' | 'success' | 'error'
  >('idle')
  const [result, setResult] = useState<any>(null)
  
  const retryProgress = useRetryProgress()
  const { handleRetryError } = useRetryErrorHandler()

  const generateItinerary = useCallback(async () => {
    // FR-003.2: Clear any previous state
    retryProgress.reset()
    setGenerationState('generating')
    setResult(null)

    // FR-003.3: Start retry system and get cancellation token
    const cancellationToken = retryProgress.startRetry()

    try {
      // Make API call with retry progress tracking
      const response = await fetch(`/api/user/trips/${tripData.tripId}/generate-itinerary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Include retry progress callback
          onProgress: retryProgress.updateProgress,
          cancellationToken
        })
      })

      // Check for cancellation after network request
      if (cancellationToken.isCancelled) {
        throw new Error('Operation cancelled by user')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Generation failed')
      }

      const data = await response.json()
      
      // FR-003.4: Success handling
      setResult(data)
      setGenerationState('success')
      onSuccess?.(data)
      
      // FR-003.4: Don't indicate retries occurred on success
      retryProgress.reset()

    } catch (error) {
      // FR-003.5: Error handling and retry failure escalation
      const errorMessage = handleRetryError(error)
      
      setGenerationState('error')
      retryProgress.setError(errorMessage)
      onError?.(errorMessage)
      
      console.error('Itinerary generation failed:', error)
    }
  }, [tripData.tripId, retryProgress, handleRetryError, onSuccess, onError])

  // FR-003.3: Manual retry after cancellation
  const handleManualRetry = useCallback(() => {
    generateItinerary()
  }, [generateItinerary])

  // FR-003.3: Cancellation handling
  const handleCancel = useCallback(() => {
    retryProgress.cancelRetry()
    setGenerationState('idle')
  }, [retryProgress])

  // Auto-start if requested
  React.useEffect(() => {
    if (autoStart && generationState === 'idle') {
      generateItinerary()
    }
  }, [autoStart, generationState, generateItinerary])

  const renderContent = () => {
    switch (generationState) {
      case 'idle':
        return (
          <div className="text-center space-y-4">
            <Sparkles className="h-12 w-12 mx-auto text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Ready to Generate Itinerary</h3>
              <p className="text-gray-600 mb-4">
                Create a personalized itinerary for {tripData.destination}
              </p>
              <Button onClick={generateItinerary} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Itinerary
              </Button>
            </div>
          </div>
        )

      case 'generating':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Generating Your Itinerary</h3>
              <p className="text-gray-600 mb-4">
                AI is creating your personalized travel plan...
              </p>
            </div>
            
            {/* FR-003.2: Retry progress communication */}
            {retryProgress.state.progress && (
              <RetryProgress
                isRetrying={retryProgress.state.isRetrying}
                currentAttempt={retryProgress.state.progress.currentAttempt}
                maxAttempts={retryProgress.state.progress.maxAttempts}
                nextRetryDelay={retryProgress.state.progress.nextRetryDelay}
                error={retryProgress.state.error}
                canCancel={retryProgress.state.canCancel}
                onCancel={handleCancel}
                estimatedCompletion={retryProgress.state.progress.estimatedCompletion}
                showDetails={true}
              />
            )}

            {/* Fallback progress for initial generation */}
            {!retryProgress.state.progress && (
              <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-lg">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-blue-700">Initializing AI generation...</span>
                {retryProgress.state.canCancel && (
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        )

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-700">
                Itinerary Generated Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                Your personalized travel plan is ready
              </p>
              <Button 
                variant="outline" 
                onClick={() => setGenerationState('idle')}
                className="mr-2"
              >
                Generate Another
              </Button>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-700">Generation Failed</h3>
              <p className="text-red-600 mb-4">
                {retryProgress.state.error || 'Failed to generate itinerary'}
              </p>
              
              {/* FR-003.5: Fallback options after retry failure */}
              <div className="space-y-2">
                <Button onClick={handleManualRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setGenerationState('idle')}
                >
                  Start Over
                </Button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Itinerary Generation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}

// Compact version for integration into existing forms
export function RetryEnabledGenerationCompact({
  tripData,
  onSuccess,
  onError,
  className
}: RetryEnabledGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const retryProgress = useRetryProgress()
  const { handleRetryError } = useRetryErrorHandler()

  const generateItinerary = useCallback(async () => {
    retryProgress.reset()
    setIsGenerating(true)

    const cancellationToken = retryProgress.startRetry()

    try {
      const response = await fetch(`/api/user/trips/${tripData.tripId}/generate-itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (cancellationToken.isCancelled) {
        throw new Error('Operation cancelled by user')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Generation failed')
      }

      const data = await response.json()
      onSuccess?.(data)
      retryProgress.reset()

    } catch (error) {
      const errorMessage = handleRetryError(error)
      retryProgress.setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [tripData.tripId, retryProgress, handleRetryError, onSuccess, onError])

  if (isGenerating && retryProgress.state.progress) {
    return (
      <div className={className}>
        <RetryProgress
          isRetrying={retryProgress.state.isRetrying}
          currentAttempt={retryProgress.state.progress.currentAttempt}
          maxAttempts={retryProgress.state.progress.maxAttempts}
          nextRetryDelay={retryProgress.state.progress.nextRetryDelay}
          error={retryProgress.state.error}
          canCancel={retryProgress.state.canCancel}
          onCancel={() => {
            retryProgress.cancelRetry()
            setIsGenerating(false)
          }}
          showDetails={false}
        />
      </div>
    )
  }

  return (
    <Button 
      onClick={generateItinerary} 
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Itinerary
        </>
      )}
    </Button>
  )
}