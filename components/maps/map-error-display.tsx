"use client"

import { useState } from 'react'
import { MapError, MapLoadingState } from '@/lib/map-error-handler'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Wifi, RefreshCw, ExternalLink, Map, MapPin } from 'lucide-react'

interface MapErrorDisplayProps {
  error: MapError
  loadingState: MapLoadingState
  onRetry?: () => void
  onFallback?: (type: 'static' | 'external' | 'coordinates') => void
  coordinates?: Array<{ lat: number; lng: number; name?: string }>
  className?: string
}

export function MapErrorDisplay({
  error,
  loadingState,
  onRetry,
  onFallback,
  coordinates = [],
  className = ''
}: MapErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <Wifi className="w-8 h-8 text-orange-600" />
      case 'token':
      case 'quota':
        return <AlertTriangle className="w-8 h-8 text-red-600" />
      case 'api':
      case 'loading':
        return <Map className="w-8 h-8 text-blue-600" />
      default:
        return <AlertTriangle className="w-8 h-8 text-gray-600" />
    }
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Connection Problem'
      case 'token':
        return 'Map Configuration Issue'
      case 'quota':
        return 'Map Service Limit Reached'
      case 'api':
        return 'Map Service Unavailable'
      case 'loading':
        return 'Map Loading Failed'
      default:
        return 'Map Error'
    }
  }

  const getRetryButtonText = () => {
    if (loadingState.isLoading) {
      return `Retrying... (${loadingState.retryCount}/${3})`
    }
    return 'Try Again'
  }

  const canRetry = error.retryable && loadingState.retryCount < 3

  return (
    <div className={`relative w-full h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>

          {/* Error Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {getErrorTitle()}
          </h3>

          {/* Error Message */}
          <p className="text-sm text-gray-600 mb-4">
            {error.message}
          </p>

          {/* Suggestion */}
          {error.fallbackSuggestion && (
            <p className="text-xs text-gray-500 mb-6 bg-gray-100 p-3 rounded-lg">
              <strong>Suggestion:</strong> {error.fallbackSuggestion}
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Retry Button */}
            {canRetry && onRetry && (
              <Button
                onClick={onRetry}
                disabled={loadingState.isLoading}
                className="w-full"
                variant="default"
              >
                {loadingState.isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {getRetryButtonText()}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            )}

            {/* Fallback Options */}
            <div className="grid grid-cols-1 gap-2">
              {/* Static Map Fallback */}
              {coordinates.length > 0 && onFallback && (
                <Button
                  onClick={() => onFallback('static')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View Static Map
                </Button>
              )}

              {/* External Maps */}
              {coordinates.length > 0 && onFallback && (
                <Button
                  onClick={() => onFallback('external')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in External Map
                </Button>
              )}

              {/* Coordinates List */}
              {coordinates.length > 0 && onFallback && (
                <Button
                  onClick={() => onFallback('coordinates')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Show Coordinates List
                </Button>
              )}
            </div>
          </div>

          {/* Error Details Toggle */}
          <div className="mt-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>

            {showDetails && (
              <div className="mt-3 p-3 bg-gray-100 rounded-lg text-left">
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Error Type:</strong> {error.type}</div>
                  {error.code && <div><strong>Code:</strong> {error.code}</div>}
                  <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
                  <div><strong>Retry Count:</strong> {loadingState.retryCount}</div>
                  {loadingState.lastRetryAt && (
                    <div><strong>Last Retry:</strong> {loadingState.lastRetryAt.toLocaleTimeString()}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading state component
interface MapLoadingDisplayProps {
  message?: string
  progress?: number
  showProgress?: boolean
  className?: string
}

export function MapLoadingDisplay({
  message = 'Loading map...',
  progress,
  showProgress = false,
  className = ''
}: MapLoadingDisplayProps) {
  return (
    <div className={`relative w-full h-full bg-gray-50 rounded-lg ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {/* Loading Spinner */}
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          {/* Loading Message */}
          <p className="text-sm text-gray-600 mb-4">{message}</p>

          {/* Progress Bar */}
          {showProgress && typeof progress === 'number' && (
            <div className="w-48 bg-gray-200 rounded-full h-2 mx-auto">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Offline indicator component
interface OfflineIndicatorProps {
  isOffline: boolean
  coverage?: number
  onSwitchToOnline?: () => void
  className?: string
}

export function OfflineIndicator({
  isOffline,
  coverage,
  onSwitchToOnline,
  className = ''
}: OfflineIndicatorProps) {
  if (!isOffline) return null

  return (
    <div className={`bg-amber-100 border border-amber-300 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Wifi className="w-4 h-4 text-amber-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Offline Mode
            </p>
            {typeof coverage === 'number' && (
              <p className="text-xs text-amber-600">
                {Math.round(coverage * 100)}% area coverage available
              </p>
            )}
          </div>
        </div>

        {onSwitchToOnline && (
          <Button
            onClick={onSwitchToOnline}
            variant="outline"
            size="sm"
            className="text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            Go Online
          </Button>
        )}
      </div>
    </div>
  )
}