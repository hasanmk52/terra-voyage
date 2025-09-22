/**
 * User-Friendly Error Display Component
 * Shows categorized errors with actionable resolution steps
 */

"use client"

import { useState } from 'react'
import { 
  AlertTriangle, 
  WifiOff, 
  Clock, 
  MapPin, 
  RefreshCw, 
  Settings, 
  MessageCircle, 
  ArrowRight,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ErrorInfo, ErrorAction, ErrorCategory } from '@/lib/error-service'

interface ErrorDisplayProps {
  error: ErrorInfo
  onAction?: (action: ErrorAction) => void
  onDismiss?: () => void
  className?: string
  showTechnicalDetails?: boolean
}

// Error category to icon mapping
const categoryIcons: Record<ErrorCategory, React.ComponentType<any>> = {
  AI_QUOTA_EXCEEDED: Clock,
  INVALID_INPUT: Settings,
  SERVICE_UNAVAILABLE: AlertTriangle,
  NETWORK_ERROR: WifiOff,
  UNSUPPORTED_DESTINATION: MapPin,
  VALIDATION_ERROR: Settings,
  AUTHENTICATION_ERROR: AlertTriangle,
  RATE_LIMIT_ERROR: Clock,
  UNKNOWN_ERROR: AlertTriangle
}

// Error category to color mapping
const categoryColors: Record<ErrorCategory, { bg: string; border: string; text: string; icon: string }> = {
  AI_QUOTA_EXCEEDED: { 
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200', 
    text: 'text-yellow-800', 
    icon: 'text-yellow-600' 
  },
  INVALID_INPUT: { 
    bg: 'bg-blue-50', 
    border: 'border-blue-200', 
    text: 'text-blue-800', 
    icon: 'text-blue-600' 
  },
  SERVICE_UNAVAILABLE: { 
    bg: 'bg-red-50', 
    border: 'border-red-200', 
    text: 'text-red-800', 
    icon: 'text-red-600' 
  },
  NETWORK_ERROR: { 
    bg: 'bg-orange-50', 
    border: 'border-orange-200', 
    text: 'text-orange-800', 
    icon: 'text-orange-600' 
  },
  UNSUPPORTED_DESTINATION: { 
    bg: 'bg-purple-50', 
    border: 'border-purple-200', 
    text: 'text-purple-800', 
    icon: 'text-purple-600' 
  },
  VALIDATION_ERROR: { 
    bg: 'bg-blue-50', 
    border: 'border-blue-200', 
    text: 'text-blue-800', 
    icon: 'text-blue-600' 
  },
  AUTHENTICATION_ERROR: { 
    bg: 'bg-red-50', 
    border: 'border-red-200', 
    text: 'text-red-800', 
    icon: 'text-red-600' 
  },
  RATE_LIMIT_ERROR: { 
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200', 
    text: 'text-yellow-800', 
    icon: 'text-yellow-600' 
  },
  UNKNOWN_ERROR: { 
    bg: 'bg-gray-50', 
    border: 'border-gray-200', 
    text: 'text-gray-800', 
    icon: 'text-gray-600' 
  }
}

// Action type to icon mapping
const actionIcons: Record<ErrorAction['type'], React.ComponentType<any>> = {
  retry: RefreshCw,
  modify: Settings,
  navigate: ArrowRight,
  contact: MessageCircle,
  dismiss: X
}

export function ErrorDisplay({ 
  error, 
  onAction, 
  onDismiss, 
  className,
  showTechnicalDetails = false 
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const IconComponent = categoryIcons[error.category]
  const colors = categoryColors[error.category]

  const handleAction = async (action: ErrorAction) => {
    if (action.type === 'retry') {
      setIsRetrying(true)
      try {
        if (action.handler) {
          await action.handler()
        }
        if (onAction) {
          await onAction(action)
        }
      } finally {
        setIsRetrying(false)
      }
    } else {
      if (action.url) {
        window.open(action.url, '_blank')
      }
      if (action.handler) {
        action.handler()
      }
      if (onAction) {
        onAction(action)
      }
    }
  }

  const getSeverityBadge = () => {
    const severityConfig = {
      low: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Easy Fix' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Quick Fix' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Needs Attention' },
      critical: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Urgent' }
    }
    
    const config = severityConfig[error.severity]
    return (
      <Badge variant="outline" className={cn('text-xs', config.color)}>
        {config.label}
      </Badge>
    )
  }

  return (
    <Card className={cn(
      'w-full max-w-2xl mx-auto',
      colors.bg,
      colors.border,
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-full bg-white border', colors.border)}>
              <IconComponent className={cn('h-5 w-5', colors.icon)} />
            </div>
            <div className="flex-1">
              <CardTitle className={cn('text-lg font-semibold', colors.text)}>
                {error.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getSeverityBadge()}
                {error.retryable && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Can Retry
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className={cn('hover:bg-white/50', colors.text)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* User-friendly message */}
        <div className={cn('text-sm leading-relaxed mb-6', colors.text)}>
          {error.userMessage}
        </div>

        {/* Action buttons */}
        {error.actionable && error.actions.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className={cn('text-sm font-medium', colors.text)}>
              What you can do:
            </h4>
            <div className="grid gap-2">
              {error.actions.map((action, index) => {
                const ActionIcon = actionIcons[action.type]
                const isPrimary = index === 0
                const isRetryAction = action.type === 'retry'
                
                return (
                  <Button
                    key={index}
                    variant={isPrimary ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAction(action)}
                    disabled={isRetryAction && isRetrying}
                    className={cn(
                      'justify-start h-auto p-3 text-left',
                      !isPrimary && 'bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <ActionIcon className={cn(
                        'h-4 w-4 flex-shrink-0',
                        isRetryAction && isRetrying && 'animate-spin'
                      )} />
                      <div className="flex-1">
                        <div className="font-medium">
                          {isRetryAction && isRetrying ? 'Retrying...' : action.label}
                        </div>
                        {action.description && (
                          <div className="text-xs opacity-75 mt-1">
                            {action.description}
                          </div>
                        )}
                      </div>
                      {action.url && (
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Technical details toggle */}
        {showTechnicalDetails && error.technicalDetails && (
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className={cn('p-0 h-auto font-normal', colors.text)}
            >
              <div className="flex items-center gap-2">
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="text-xs">
                  {showDetails ? 'Hide' : 'Show'} technical details
                </span>
              </div>
            </Button>
            
            {showDetails && (
              <div className="mt-3 p-3 bg-white rounded border font-mono text-xs text-gray-600 break-all">
                {error.technicalDetails}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Simplified error display for inline use
export function InlineErrorDisplay({ 
  error, 
  onAction, 
  onDismiss, 
  className 
}: ErrorDisplayProps) {
  const IconComponent = categoryIcons[error.category]
  const colors = categoryColors[error.category]

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border',
      colors.bg,
      colors.border,
      className
    )}>
      <IconComponent className={cn('h-5 w-5 mt-0.5 flex-shrink-0', colors.icon)} />
      <div className="flex-1">
        <div className={cn('font-medium text-sm', colors.text)}>
          {error.title}
        </div>
        <div className={cn('text-sm mt-1 opacity-90', colors.text)}>
          {error.userMessage}
        </div>
        {error.actionable && error.actions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {error.actions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                variant={index === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAction?.(action)}
                className="h-8"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className={cn('h-8 w-8 p-0', colors.text)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}