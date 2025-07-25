'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw, Plane } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Automatically redirect when back online
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    }
    
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    
    // Try to reload the page
    if (navigator.onLine) {
      window.location.reload()
    } else {
      // Show feedback that we're still offline
      setTimeout(() => setRetryCount(prev => prev - 1), 2000)
    }
  }

  const openCachedTrips = () => {
    // This would open cached trips from IndexedDB
    window.location.href = '/trips?offline=true'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Status Icon */}
        <div className="mb-6">
          {isOnline ? (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <Wifi className="w-10 h-10 text-green-600" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
              <WifiOff className="w-10 h-10 text-red-600" />
            </div>
          )}
        </div>

        {/* Status Message */}
        {isOnline ? (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connection Restored!
            </h1>
            <p className="text-gray-600 mb-6">
              Great! You're back online. Redirecting you now...
            </p>
            <div className="flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mr-2" />
              <span className="text-blue-600 font-medium">Redirecting...</span>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              You're Offline
            </h1>
            <p className="text-gray-600 mb-6">
              It looks like you've lost your internet connection. Don't worry, you can still access your cached trips!
            </p>

            {/* Offline Actions */}
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                disabled={retryCount > 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {retryCount > 0 ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Checking Connection...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </span>
                )}
              </button>

              <button
                onClick={openCachedTrips}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <span className="flex items-center justify-center">
                  <Plane className="w-4 h-4 mr-2" />
                  View Cached Trips
                </span>
              </button>
            </div>

            {/* Offline Features Info */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                What you can do offline:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• View previously cached trips</li>
                <li>• Edit trip details (will sync when online)</li>
                <li>• View downloaded maps and guides</li>
                <li>• Access emergency information</li>
              </ul>
            </div>
          </div>
        )}

        {/* App Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center text-gray-500">
            <Plane className="w-4 h-4 mr-2" />
            <span className="text-sm">Terra Voyage</span>
          </div>
        </div>
      </div>
    </div>
  )
}