/**
 * React Hook for managing retry progress state and UI feedback
 * Provides retry progress tracking, cancellation, and error handling
 */

import { useState, useCallback, useRef } from 'react'
import { 
  RetryProgress, 
  CancellationToken, 
  createCancellationToken,
  RetryCancelledException,
  RetryExhaustedException
} from '@/lib/retry-logic'

interface UseRetryProgressState {
  isRetrying: boolean
  progress: RetryProgress | null
  error: string | null
  canCancel: boolean
}

interface UseRetryProgressReturn {
  // State
  state: UseRetryProgressState
  
  // Actions
  startRetry: () => CancellationToken
  cancelRetry: () => void
  updateProgress: (progress: RetryProgress) => void
  setError: (error: string | null) => void
  reset: () => void
  
  // Computed values
  progressPercentage: number
  timeRemaining: number | null
  retryMessage: string
}

export function useRetryProgress(): UseRetryProgressReturn {
  const [state, setState] = useState<UseRetryProgressState>({
    isRetrying: false,
    progress: null,
    error: null,
    canCancel: false
  })
  
  const cancellationTokenRef = useRef<CancellationToken | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  const startRetry = useCallback((): CancellationToken => {
    const token = createCancellationToken()
    cancellationTokenRef.current = token
    startTimeRef.current = Date.now()
    
    setState({
      isRetrying: true,
      progress: null,
      error: null,
      canCancel: true
    })
    
    return token
  }, [])

  const cancelRetry = useCallback(() => {
    if (cancellationTokenRef.current && !cancellationTokenRef.current.isCancelled) {
      cancellationTokenRef.current.cancel()
      setState(prev => ({
        ...prev,
        isRetrying: false,
        canCancel: false,
        error: 'Operation cancelled by user'
      }))
    }
  }, [])

  const updateProgress = useCallback((progress: RetryProgress) => {
    setState(prev => ({
      ...prev,
      progress,
      isRetrying: progress.isRetrying || progress.currentAttempt < progress.maxAttempts,
      error: progress.error || null
    }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isRetrying: false,
      canCancel: false
    }))
  }, [])

  const reset = useCallback(() => {
    cancellationTokenRef.current = null
    setState({
      isRetrying: false,
      progress: null,
      error: null,
      canCancel: false
    })
  }, [])

  // Computed values
  const progressPercentage = state.progress 
    ? Math.round((state.progress.currentAttempt / state.progress.maxAttempts) * 100)
    : 0

  const timeRemaining = state.progress?.estimatedCompletion 
    ? Math.max(0, state.progress.estimatedCompletion - Date.now())
    : null

  const retryMessage = state.progress
    ? state.progress.isRetrying
      ? `Retrying... Attempt ${state.progress.currentAttempt} of ${state.progress.maxAttempts}`
      : `Attempting ${state.progress.currentAttempt} of ${state.progress.maxAttempts}...`
    : 'Preparing...'

  return {
    state,
    startRetry,
    cancelRetry,
    updateProgress,
    setError,
    reset,
    progressPercentage,
    timeRemaining,
    retryMessage
  }
}

// Helper hook for handling retry errors
export function useRetryErrorHandler() {
  const handleRetryError = useCallback((error: unknown): string => {
    if (error instanceof RetryCancelledException) {
      return 'Operation was cancelled'
    }
    
    if (error instanceof RetryExhaustedException) {
      // Extract meaningful error from the last attempt
      const lastError = error.lastError?.message || 'Unknown error'
      
      // Categorize error for user-friendly message
      if (lastError.includes('AI_SERVICE_TIMEOUT')) {
        return 'The AI service is taking too long to respond. Please try again later.'
      }
      if (lastError.includes('AI_QUOTA_EXCEEDED')) {
        return 'AI service quota exceeded. Please try again later or contact support.'
      }
      if (lastError.includes('RATE_LIMIT_ERROR')) {
        return 'Too many requests. Please wait a moment and try again.'
      }
      if (lastError.includes('AUTHENTICATION_ERROR')) {
        return 'Authentication failed. Please check your account settings.'
      }
      if (lastError.includes('SERVICE_UNAVAILABLE')) {
        return 'The AI service is temporarily unavailable. Please try again in a few minutes.'
      }
      
      return `Failed after ${error.attempts.length} attempts. Please try again later.`
    }
    
    if (error instanceof Error) {
      return error.message
    }
    
    return 'An unexpected error occurred'
  }, [])

  return { handleRetryError }
}