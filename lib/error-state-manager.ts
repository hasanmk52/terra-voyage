/**
 * Error State Manager with Form Data Preservation
 * Manages error states while preserving user input across failures
 */

"use client"

import React, { useState, useCallback, useRef } from 'react'
import { ErrorInfo, errorService } from './error-service'

export interface ErrorStateData {
  error: ErrorInfo | null
  isVisible: boolean
  isDismissible: boolean
  preservedData: any
  retryCount: number
  lastErrorTime: Date | null
}

export interface ErrorStateManager {
  errorState: ErrorStateData
  showError: (error: Error | string, context?: string, preserveData?: any) => void
  dismissError: () => void
  retryLastAction: () => Promise<void>
  clearError: () => void
  setRetryHandler: (handler: () => Promise<void>) => void
  getPreservedData: <T>() => T | null
}

const STORAGE_KEY = 'terra-voyage-error-state'
const MAX_RETRY_COUNT = 3

export function useErrorStateManager(): ErrorStateManager {
  const [errorState, setErrorState] = useState<ErrorStateData>({
    error: null,
    isVisible: false,
    isDismissible: true,
    preservedData: null,
    retryCount: 0,
    lastErrorTime: null
  })

  const retryHandlerRef = useRef<(() => Promise<void>) | null>(null)

  // Load preserved state from storage
  const loadPreservedState = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          preservedData: parsed.preservedData,
          retryCount: parsed.retryCount || 0,
          lastErrorTime: parsed.lastErrorTime ? new Date(parsed.lastErrorTime) : null
        }
      }
    } catch (error) {
      console.warn('Failed to load preserved error state:', error)
    }
    return null
  }, [])

  // Save state to storage
  const savePreservedState = useCallback((data: any, retryCount: number, lastErrorTime: Date) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        preservedData: data,
        retryCount,
        lastErrorTime: lastErrorTime.toISOString()
      }))
    } catch (error) {
      console.warn('Failed to save preserved error state:', error)
    }
  }, [])

  // Clear preserved state
  const clearPreservedState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear preserved error state:', error)
    }
  }, [])

  const showError = useCallback((
    error: Error | string, 
    context?: string, 
    preserveData?: any
  ) => {
    const now = new Date()
    const preservedState = loadPreservedState()
    
    // Determine retry count
    let retryCount = 0
    if (preservedState?.lastErrorTime) {
      const timeDiff = now.getTime() - preservedState.lastErrorTime.getTime()
      // Reset retry count if last error was more than 5 minutes ago
      if (timeDiff < 300000) { // 5 minutes
        retryCount = Math.min(preservedState.retryCount + 1, MAX_RETRY_COUNT)
      }
    }

    // Categorize the error
    const errorInfo = errorService.categorizeError(error, context)

    // Determine what data to preserve
    const dataToPreserve = preserveData || preservedState?.preservedData || null

    // Save state if we have data to preserve
    if (dataToPreserve) {
      savePreservedState(dataToPreserve, retryCount, now)
    }

    setErrorState({
      error: errorInfo,
      isVisible: true,
      isDismissible: errorInfo.severity !== 'critical',
      preservedData: dataToPreserve,
      retryCount,
      lastErrorTime: now
    })
  }, [loadPreservedState, savePreservedState])

  const dismissError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      isVisible: false
    }))
  }, [])

  const clearError = useCallback(() => {
    clearPreservedState()
    setErrorState({
      error: null,
      isVisible: false,
      isDismissible: true,
      preservedData: null,
      retryCount: 0,
      lastErrorTime: null
    })
  }, [clearPreservedState])

  const retryLastAction = useCallback(async () => {
    if (retryHandlerRef.current && errorState.error?.retryable) {
      try {
        await retryHandlerRef.current()
        // Clear error on successful retry
        clearError()
      } catch (error) {
        // Show new error if retry fails
        showError(error as Error, 'retry')
      }
    }
  }, [errorState.error, clearError, showError])

  const setRetryHandler = useCallback((handler: () => Promise<void>) => {
    retryHandlerRef.current = handler
  }, [])

  const getPreservedData = useCallback(<T>(): T | null => {
    return errorState.preservedData as T || null
  }, [errorState.preservedData])

  return {
    errorState,
    showError,
    dismissError,
    retryLastAction,
    clearError,
    setRetryHandler,
    getPreservedData
  }
}

// Higher-order component for automatic error state management
export function withErrorStateManager<P extends object>(
  Component: React.ComponentType<P & { errorManager: ErrorStateManager }>
) {
  return function WrappedComponent(props: P) {
    const errorManager = useErrorStateManager()
    
    return React.createElement(Component, {
      ...props,
      errorManager
    })
  }
}

// Hook for form data preservation
export function useFormDataPreservation<T extends Record<string, any>>(
  formData: T,
  errorManager: ErrorStateManager
) {
  const preserveFormData = useCallback(() => {
    errorManager.showError('Form data preserved for retry', 'form', formData)
  }, [formData, errorManager])

  const restoreFormData = useCallback((): Partial<T> | null => {
    return errorManager.getPreservedData<T>()
  }, [errorManager])

  const clearFormData = useCallback(() => {
    errorManager.clearError()
  }, [errorManager])

  return {
    preserveFormData,
    restoreFormData,
    clearFormData
  }
}

// Context for error state management
import { createContext, useContext } from 'react'

const ErrorStateContext = createContext<ErrorStateManager | null>(null)

export function ErrorStateProvider({ children }: { children: React.ReactNode }) {
  const errorManager = useErrorStateManager()

  return React.createElement(ErrorStateContext.Provider, {
    value: errorManager
  }, children)
}

export function useErrorState(): ErrorStateManager {
  const context = useContext(ErrorStateContext)
  if (!context) {
    throw new Error('useErrorState must be used within an ErrorStateProvider')
  }
  return context
}