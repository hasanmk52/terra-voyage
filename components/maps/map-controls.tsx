"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Map, Car, Bike, MapPin, Eye, EyeOff } from 'lucide-react'
import { MAPBOX_CONFIG } from '@/lib/mapbox-config'

interface MapControlsProps {
  onStyleChange: (style: keyof typeof MAPBOX_CONFIG.STYLES) => void
  onTransportModeChange: (mode: 'walking' | 'driving' | 'cycling') => void
  currentStyle: keyof typeof MAPBOX_CONFIG.STYLES
  currentTransportMode: 'walking' | 'driving' | 'cycling'
  showRoutes: boolean
  onToggleRoutes: (show: boolean) => void
}

export function MapControls({
  onStyleChange,
  onTransportModeChange,
  currentStyle,
  currentTransportMode,
  showRoutes,
  onToggleRoutes
}: MapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const transportModes = [
    { value: 'walking', label: 'Walking', icon: MapPin },
    { value: 'driving', label: 'Driving', icon: Car },
    { value: 'cycling', label: 'Cycling', icon: Bike }
  ] as const

  const mapStyles = [
    { value: 'streets', label: 'Streets' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'outdoors', label: 'Outdoors' }
  ] as const

  return (
    <Card className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm shadow-lg border-0 max-w-[calc(100vw-2rem)] sm:max-w-none">
      <CardContent className="p-2 sm:p-3">
        <div className="flex items-center gap-2">
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 h-8 w-8"
          >
            <Map className="h-4 w-4" />
          </Button>

          {/* Expanded Controls */}
          {isExpanded && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 ml-2 pl-2 border-l border-gray-200 sm:border-l-0 sm:border-t-0 border-t sm:border-l w-full sm:w-auto">
              {/* Map Style Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Style</label>
                <Select
                  value={currentStyle}
                  onValueChange={(value) => onStyleChange(value as keyof typeof MAPBOX_CONFIG.STYLES)}
                >
                  <SelectTrigger className="w-full sm:w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mapStyles.map((style) => (
                      <SelectItem key={style.value} value={style.value} className="text-xs">
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transport Mode Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Transport</label>
                <div className="flex gap-1">
                  {transportModes.map((mode) => {
                    const Icon = mode.icon
                    return (
                      <Button
                        key={mode.value}
                        variant={currentTransportMode === mode.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => onTransportModeChange(mode.value)}
                        className="p-1.5 h-8 w-8"
                        title={mode.label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Route Toggle */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Routes</label>
                <Button
                  variant={showRoutes ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleRoutes(!showRoutes)}
                  className="p-1.5 h-8 w-8"
                  title={showRoutes ? "Hide Routes" : "Show Routes"}
                >
                  {showRoutes ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MapControls