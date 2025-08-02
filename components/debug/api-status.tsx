"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { googlePlaces } from '@/lib/google-places'
// API status configuration
const serviceConfig = {
  useRealAI: !!process.env.GEMINI_API_KEY,
  useRealMaps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  useRealWeather: !!process.env.WEATHER_API_KEY,
  useRealMapbox: !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  useRealDatabase: !!process.env.DATABASE_URL,
}

interface ApiStatus {
  name: string
  status: 'success' | 'error' | 'warning' | 'testing'
  message: string
  key?: string
}

export function ApiStatusDebug() {
  const [statuses, setStatuses] = useState<ApiStatus[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const testApis = async () => {
    const results: ApiStatus[] = []

    // Test Google Maps API
    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!googleMapsKey || googleMapsKey === 'your-google-maps-api-key') {
      results.push({
        name: 'Google Maps API',
        status: 'error',
        message: 'API key not configured',
        key: 'Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
      })
    } else if (googleMapsKey.length < 20) {
      results.push({
        name: 'Google Maps API',
        status: 'warning',
        message: 'API key looks invalid (too short)',
        key: `Key length: ${googleMapsKey.length}`
      })
    } else {
      // Test actual API call
      try {
        results.push({
          name: 'Google Maps API',
          status: 'testing',
          message: 'Testing API connection...',
          key: `Key: ${googleMapsKey.substring(0, 8)}...`
        })
        
        const testResults = await googlePlaces.searchDestinations('Paris')
        results[results.length - 1] = {
          name: 'Google Maps API',
          status: testResults.length > 0 ? 'success' : 'warning',
          message: testResults.length > 0 
            ? `Working! Found ${testResults.length} results`
            : 'API key valid but no results returned',
          key: `Key: ${googleMapsKey.substring(0, 8)}...`
        }
      } catch (error) {
        results[results.length - 1] = {
          name: 'Google Maps API',
          status: 'error',
          message: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          key: `Key: ${googleMapsKey.substring(0, 8)}...`
        }
      }
    }

    // Test Mapbox
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    if (!mapboxToken || mapboxToken === 'your-mapbox-token') {
      results.push({
        name: 'Mapbox',
        status: 'error',
        message: 'Token not configured',
        key: 'Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'
      })
    } else if (!mapboxToken.startsWith('pk.')) {
      results.push({
        name: 'Mapbox',
        status: 'error',
        message: 'Invalid token type (need public token starting with pk.)',
        key: `Token: ${mapboxToken.substring(0, 8)}...`
      })
    } else {
      results.push({
        name: 'Mapbox',
        status: 'success',
        message: 'Token configured correctly',
        key: `Token: ${mapboxToken.substring(0, 8)}...`
      })
    }

    // Environment info
    results.push({
      name: 'Environment',
      status: 'success',
      message: `Node ENV: ${process.env.NODE_ENV || 'undefined'}`,
      key: `Build: ${process.env.VERCEL ? 'Vercel' : 'Local'}`
    })

    // Service configuration
    results.push({
      name: 'Service Config',
      status: serviceConfig.useRealMaps ? 'success' : 'warning',
      message: `Maps: ${serviceConfig.useRealMaps ? 'Real API' : 'Mock'}, Weather: ${serviceConfig.useRealWeather ? 'Real API' : 'Mock'}`,
      key: `Mapbox: ${serviceConfig.useRealMapbox ? 'Real' : 'Mock'}`
    })

    setStatuses(results)
  }

  useEffect(() => {
    // Only show debug panel in development or if explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      new URLSearchParams(window.location.search).has('debug')
    setIsVisible(shouldShow)
    
    if (shouldShow) {
      testApis()
    }
  }, [])

  if (!isVisible) return null

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'testing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">API Status Debug</h3>
        <button
          onClick={testApis}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-2">
        {statuses.map((status, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            {getStatusIcon(status.status)}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{status.name}</div>
              <div className="text-gray-600 break-words">{status.message}</div>
              {status.key && (
                <div className="text-xs text-gray-500 font-mono break-all">{status.key}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Add ?debug to URL to show this panel in production
        </p>
      </div>
    </div>
  )
}