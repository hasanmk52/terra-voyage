"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapErrorHandler } from '@/lib/map-error-handler'
import { 
  ExternalLink, 
  MapPin, 
  Navigation, 
  Copy, 
  Check,
  Map as MapIcon,
  Smartphone
} from 'lucide-react'
import { toast } from 'sonner'

interface MapFallbackOptionsProps {
  coordinates: Array<{ 
    lat: number
    lng: number
    name?: string
    type?: string
  }>
  onClose?: () => void
  className?: string
}

export function MapFallbackOptions({
  coordinates,
  onClose,
  className = ''
}: MapFallbackOptionsProps) {
  const [activeTab, setActiveTab] = useState<'static' | 'external' | 'coordinates'>('static')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopyCoordinates = async (lat: number, lng: number, index: number) => {
    try {
      await navigator.clipboard.writeText(`${lat}, ${lng}`)
      setCopiedIndex(index)
      toast.success('Coordinates copied to clipboard')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      toast.error('Failed to copy coordinates')
    }
  }

  const generateStaticMapUrl = () => {
    try {
      return MapErrorHandler.generateStaticMapUrl(coordinates, {
        width: 600,
        height: 400,
        zoom: coordinates.length === 1 ? 15 : undefined
      })
    } catch (error) {
      console.error('Failed to generate static map URL:', error)
      return null
    }
  }

  const getExternalMapLinks = (coord: { lat: number; lng: number; name?: string }) => {
    return MapErrorHandler.generateExternalMapLinks(coord, coord.name)
  }

  const renderStaticMap = () => {
    const staticMapUrl = generateStaticMapUrl()
    
    if (!staticMapUrl) {
      return (
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Static map unavailable. Google Maps API key required.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border overflow-hidden">
          <img
            src={staticMapUrl}
            alt="Static map showing locations"
            className="w-full h-64 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
          <div className="hidden bg-gray-100 h-64 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Failed to load static map</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => window.open(staticMapUrl, '_blank')}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Full Size
          </Button>
          <Button
            onClick={() => handleCopyCoordinates(
              coordinates[0]?.lat || 0, 
              coordinates[0]?.lng || 0, 
              -1
            )}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {copiedIndex === -1 ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copy Link
          </Button>
        </div>
      </div>
    )
  }

  const renderExternalMaps = () => {
    return (
      <div className="space-y-4">
        {coordinates.map((coord, index) => {
          const links = getExternalMapLinks(coord)
          
          return (
            <div key={index} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {coord.name || `Location ${index + 1}`}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                  </p>
                  {coord.type && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mt-1">
                      {coord.type}
                    </span>
                  )}
                </div>
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => window.open(links.google, '_blank')}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <img 
                    src="https://www.google.com/favicon.ico" 
                    alt="Google Maps"
                    className="w-4 h-4 mr-2"
                  />
                  Open in Google Maps
                </Button>
                
                <Button
                  onClick={() => window.open(links.apple, '_blank')}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Open in Apple Maps
                </Button>
                
                <Button
                  onClick={() => window.open(links.bing, '_blank')}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Open in Bing Maps
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderCoordinatesList = () => {
    return (
      <div className="space-y-3">
        {coordinates.map((coord, index) => (
          <div key={index} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <h4 className="font-medium text-gray-900">
                    {coord.name || `Location ${index + 1}`}
                  </h4>
                  {coord.type && (
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {coord.type}
                    </span>
                  )}
                </div>
                
                <div className="font-mono text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div>Latitude: {coord.lat.toFixed(6)}</div>
                  <div>Longitude: {coord.lng.toFixed(6)}</div>
                </div>
              </div>
              
              <Button
                onClick={() => handleCopyCoordinates(coord.lat, coord.lng, index)}
                variant="outline"
                size="sm"
                className="ml-3"
              >
                {copiedIndex === index ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        {/* Copy All Button */}
        <Button
          onClick={async () => {
            try {
              const allCoords = coordinates
                .map(coord => `${coord.name || 'Location'}: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`)
                .join('\n')
              
              await navigator.clipboard.writeText(allCoords)
              toast.success('All coordinates copied to clipboard')
            } catch (error) {
              toast.error('Failed to copy coordinates')
            }
          }}
          variant="outline"
          className="w-full"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy All Coordinates
        </Button>
      </div>
    )
  }

  if (coordinates.length === 0) {
    return (
      <div className={`bg-white rounded-lg border p-6 text-center ${className}`}>
        <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">No location data available</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Map Alternatives</h3>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              ×
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Choose an alternative way to view your locations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('static')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'static'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Static Map
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'external'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            External Maps
          </button>
          <button
            onClick={() => setActiveTab('coordinates')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'coordinates'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Coordinates
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'static' && renderStaticMap()}
        {activeTab === 'external' && renderExternalMaps()}
        {activeTab === 'coordinates' && renderCoordinatesList()}
      </div>
    </div>
  )
}