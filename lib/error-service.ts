/**
 * Centralized Error Handling Service for Terra Voyage
 * Provides user-friendly error messages and categorization
 */

export type ErrorCategory = 
  | 'AI_QUOTA_EXCEEDED'
  | 'INVALID_INPUT'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'UNSUPPORTED_DESTINATION'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'UNKNOWN_ERROR'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorInfo {
  category: ErrorCategory
  severity: ErrorSeverity
  title: string
  message: string
  userMessage: string
  actionable: boolean
  retryable: boolean
  actions: ErrorAction[]
  technicalDetails?: string
}

export interface ErrorAction {
  type: 'retry' | 'modify' | 'navigate' | 'contact' | 'dismiss'
  label: string
  description?: string
  url?: string
  handler?: () => void
}

class ErrorService {
  private errorHistory: Array<{ category: ErrorCategory; timestamp: Date; count: number }> = []
  private readonly maxHistorySize = 50

  /**
   * Categorize and process an error into user-friendly format
   */
  categorizeError(error: Error | string, context?: string): ErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error.message
    const lowerMessage = errorMessage.toLowerCase()

    // Analyze error patterns to determine category
    let category: ErrorCategory = 'UNKNOWN_ERROR'
    let severity: ErrorSeverity = 'medium'

    if (this.isQuotaError(lowerMessage)) {
      category = 'AI_QUOTA_EXCEEDED'
      severity = 'high'
    } else if (this.isValidationError(lowerMessage)) {
      category = 'VALIDATION_ERROR'
      severity = 'low'
    } else if (this.isNetworkError(lowerMessage)) {
      category = 'NETWORK_ERROR'
      severity = 'medium'
    } else if (this.isRateLimitError(lowerMessage)) {
      category = 'RATE_LIMIT_ERROR'
      severity = 'medium'
    } else if (this.isServiceUnavailableError(lowerMessage)) {
      category = 'SERVICE_UNAVAILABLE'
      severity = 'high'
    } else if (this.isInputError(lowerMessage)) {
      category = 'INVALID_INPUT'
      severity = 'low'
    } else if (this.isAuthError(lowerMessage)) {
      category = 'AUTHENTICATION_ERROR'
      severity = 'high'
    } else if (this.isUnsupportedDestinationError(lowerMessage, context)) {
      category = 'UNSUPPORTED_DESTINATION'
      severity = 'medium'
    }

    // Track error frequency
    this.trackError(category)

    // Get user-friendly error information
    const errorInfo = this.getErrorInfo(category, errorMessage, context)

    // Enhance with progressive disclosure based on history
    return this.enhanceWithHistory(errorInfo)
  }

  /**
   * Get user-friendly error information based on category
   */
  private getErrorInfo(category: ErrorCategory, originalMessage: string, context?: string): ErrorInfo {
    const errorMappings: Record<ErrorCategory, Omit<ErrorInfo, 'technicalDetails'>> = {
      AI_QUOTA_EXCEEDED: {
        category,
        severity: 'high',
        title: 'High Demand Right Now',
        message: 'Our AI travel planner is experiencing high demand at the moment.',
        userMessage: "We're experiencing high demand for trip planning right now. This usually resolves quickly.",
        actionable: true,
        retryable: true,
        actions: [
          { type: 'retry', label: 'Try Again', description: 'Wait a moment and try generating your trip again' },
          { type: 'modify', label: 'Use Quick Plan', description: 'Try our faster planning option with basic recommendations' },
          { type: 'contact', label: 'Get Notified', description: "We'll email you when service is back to normal" }
        ]
      },

      INVALID_INPUT: {
        category,
        severity: 'low',
        title: 'Trip Details Need Adjustment',
        message: 'Some of your trip details need to be updated to create your itinerary.',
        userMessage: 'We need to adjust a few details about your trip to create the perfect itinerary.',
        actionable: true,
        retryable: true,
        actions: [
          { type: 'modify', label: 'Review Details', description: 'Check your destination, dates, and other trip information' },
          { type: 'retry', label: 'Try Again', description: 'Attempt to generate your trip with current details' }
        ]
      },

      SERVICE_UNAVAILABLE: {
        category,
        severity: 'high',
        title: 'Service Temporarily Unavailable',
        message: 'Our trip planning service is temporarily unavailable for maintenance.',
        userMessage: "We're performing quick maintenance to improve your experience. This usually takes just a few minutes.",
        actionable: true,
        retryable: true,
        actions: [
          { type: 'retry', label: 'Try Again', description: 'Check if service has resumed' },
          { type: 'navigate', label: 'Browse Templates', description: 'Explore pre-made trip templates while you wait', url: '/templates' },
          { type: 'contact', label: 'Get Updates', description: 'Stay informed about service status' }
        ]
      },

      NETWORK_ERROR: {
        category,
        severity: 'medium',
        title: 'Connection Issue',
        message: 'Unable to connect to our servers. Please check your internet connection.',
        userMessage: "It looks like there's a connection issue. This is usually a quick fix.",
        actionable: true,
        retryable: true,
        actions: [
          { type: 'retry', label: 'Try Again', description: 'Retry your request' },
          { type: 'dismiss', label: 'Check Connection', description: 'Verify your internet connection and try again' }
        ]
      },

      UNSUPPORTED_DESTINATION: {
        category,
        severity: 'medium',
        title: 'Destination Not Yet Supported',
        message: "We don't have enough information about this destination to create a detailed itinerary.",
        userMessage: "We're still building our knowledge about this destination. Try a major city or popular tourist area.",
        actionable: true,
        retryable: false,
        actions: [
          { type: 'modify', label: 'Choose Different Destination', description: 'Select a major city or popular tourist destination' },
          { type: 'navigate', label: 'Browse Destinations', description: 'See all supported destinations', url: '/destinations' },
          { type: 'contact', label: 'Request Destination', description: "Let us know you'd like this destination added" }
        ]
      },

      VALIDATION_ERROR: {
        category,
        severity: 'low',
        title: 'Information Needs Updating',
        message: 'Some information in your trip needs to be updated.',
        userMessage: 'We found some details that need a quick update to create your perfect trip.',
        actionable: true,
        retryable: true,
        actions: [
          { type: 'modify', label: 'Update Details', description: 'Review and update your trip information' },
          { type: 'retry', label: 'Try Again', description: 'Attempt to create trip with current details' }
        ]
      },

      AUTHENTICATION_ERROR: {
        category,
        severity: 'high',
        title: 'Sign In Required',
        message: 'You need to sign in to access this feature.',
        userMessage: 'Please sign in to save and manage your trips.',
        actionable: true,
        retryable: false,
        actions: [
          { type: 'navigate', label: 'Sign In', description: 'Sign in to your account', url: '/auth/signin' },
          { type: 'navigate', label: 'Create Account', description: 'Create a new account', url: '/auth/signup' }
        ]
      },

      RATE_LIMIT_ERROR: {
        category,
        severity: 'medium',
        title: 'Too Many Requests',
        message: "You've made too many requests. Please wait a moment before trying again.",
        userMessage: "You're planning trips quickly! Please wait a moment before creating another one.",
        actionable: true,
        retryable: true,
        actions: [
          { type: 'retry', label: 'Try Again in 30 Seconds', description: 'Wait and then retry your request' },
          { type: 'navigate', label: 'View Existing Trips', description: 'Review your saved trips while you wait', url: '/trips' }
        ]
      },

      UNKNOWN_ERROR: {
        category,
        severity: 'medium',
        title: 'Something Unexpected Happened',
        message: 'We encountered an unexpected issue while processing your request.',
        userMessage: "Something unexpected happened, but don't worry - we're here to help.",
        actionable: true,
        retryable: true,
        actions: [
          { type: 'retry', label: 'Try Again', description: 'Retry your request' },
          { type: 'modify', label: 'Modify Trip', description: 'Try adjusting your trip details' },
          { type: 'contact', label: 'Contact Support', description: 'Get help from our team' }
        ]
      }
    }

    const baseInfo = errorMappings[category]

    // For validation errors, use the original message as the user message since it's already user-friendly
    const shouldUseOriginalMessage = category === 'VALIDATION_ERROR' && originalMessage.length > 50

    return {
      ...baseInfo,
      userMessage: shouldUseOriginalMessage ? originalMessage : baseInfo.userMessage,
      message: shouldUseOriginalMessage ? originalMessage : baseInfo.message,
      technicalDetails: originalMessage
    }
  }

  /**
   * Enhance error info with progressive disclosure based on error history
   */
  private enhanceWithHistory(errorInfo: ErrorInfo): ErrorInfo {
    const recentErrors = this.getRecentErrorCount(errorInfo.category)
    
    if (recentErrors >= 3) {
      // After 3 failures, escalate to more detailed troubleshooting
      return {
        ...errorInfo,
        severity: 'high',
        title: `Persistent ${errorInfo.title}`,
        userMessage: `${errorInfo.userMessage} Since this has happened multiple times, here are some additional options to help resolve this.`,
        actions: [
          ...errorInfo.actions,
          { type: 'navigate', label: 'Use Templates', description: 'Try our pre-made trip templates instead', url: '/templates' },
          { type: 'contact', label: 'Get Personal Help', description: 'Speak with our support team for assistance' }
        ]
      }
    }

    if (recentErrors === 1) {
      // First error - optimistic message
      return {
        ...errorInfo,
        userMessage: `${errorInfo.userMessage} This usually resolves quickly.`
      }
    }

    return errorInfo
  }

  /**
   * Track error occurrence for progressive disclosure
   */
  private trackError(category: ErrorCategory): void {
    const now = new Date()
    const existing = this.errorHistory.find(e => 
      e.category === category && 
      now.getTime() - e.timestamp.getTime() < 300000 // 5 minutes
    )

    if (existing) {
      existing.count++
      existing.timestamp = now
    } else {
      this.errorHistory.push({ category, timestamp: now, count: 1 })
    }

    // Cleanup old entries
    this.errorHistory = this.errorHistory
      .filter(e => now.getTime() - e.timestamp.getTime() < 900000) // 15 minutes
      .slice(-this.maxHistorySize)
  }

  /**
   * Get recent error count for a category
   */
  private getRecentErrorCount(category: ErrorCategory): number {
    const now = new Date()
    const recent = this.errorHistory.find(e => 
      e.category === category && 
      now.getTime() - e.timestamp.getTime() < 300000 // 5 minutes
    )
    return recent?.count || 0
  }

  /**
   * Error pattern detection methods
   */
  private isQuotaError(message: string): boolean {
    return /quota|limit|exceeded|too many|rate.*limit|usage.*limit/i.test(message)
  }

  private isValidationError(message: string): boolean {
    return /validation|invalid|missing|required|format|schema|overlap|conflict|past|dates/i.test(message)
  }

  private isNetworkError(message: string): boolean {
    return /network|connection|timeout|unreachable|offline|dns|fetch/i.test(message)
  }

  private isRateLimitError(message: string): boolean {
    return /rate.*limit|too.*many.*request|throttle/i.test(message)
  }

  private isServiceUnavailableError(message: string): boolean {
    return /service.*unavailable|maintenance|server.*error|502|503|504/i.test(message)
  }

  private isInputError(message: string): boolean {
    return /input|parameter|data|form|field|value.*invalid/i.test(message)
  }

  private isAuthError(message: string): boolean {
    return /auth|login|signin|permission|unauthorized|forbidden|401|403/i.test(message)
  }

  private isUnsupportedDestinationError(message: string, context?: string): boolean {
    return /unsupported.*destination|destination.*not.*found|invalid.*location|coordinates.*invalid/i.test(message) ||
           (context === 'destination' && /not.*found|invalid/i.test(message))
  }

  /**
   * Clear error history (useful for testing or manual reset)
   */
  clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): Array<{ category: ErrorCategory; count: number; lastOccurred: Date }> {
    const stats = new Map<ErrorCategory, { count: number; lastOccurred: Date }>()
    
    for (const error of this.errorHistory) {
      const existing = stats.get(error.category)
      if (existing) {
        existing.count += error.count
        if (error.timestamp > existing.lastOccurred) {
          existing.lastOccurred = error.timestamp
        }
      } else {
        stats.set(error.category, { count: error.count, lastOccurred: error.timestamp })
      }
    }

    return Array.from(stats.entries()).map(([category, data]) => ({
      category,
      ...data
    }))
  }
}

// Export singleton instance
export const errorService = new ErrorService()

// Utility function for quick error categorization
export function categorizeError(error: Error | string, context?: string): ErrorInfo {
  return errorService.categorizeError(error, context)
}