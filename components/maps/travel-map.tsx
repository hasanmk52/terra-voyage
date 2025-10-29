"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_CONFIG, calculateBounds, getDayColor, getMarkerColor } from '@/lib/mapbox-config'
import { Activity, Day } from '@/lib/itinerary-validation'
import { MapControls } from './map-controls'
import { ActivityPopup } from './activity-popup'
import { MapErrorDisplay, MapLoadingDisplay, OfflineIndicator } from './map-error-display'
import { MapFallbackOptions } from './map-fallback-options'
import { MapErrorHandler, type MapError, type MapLoadingState } from '@/lib/map-error-handler'
import { MapOfflineStorage } from '@/lib/map-offline-storage'
import { mapClustering, type MapPoint, type ActivityPoint, type ClusterPoint } from '@/lib/map-clustering'

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css'

interface TravelMapProps {
  days: Day[]
  destinationCoords?: { lat: number; lng: number } // Add trip destination coordinates
  selectedDay?: number
  onActivitySelect?: (activity: Activity) => void
  onDaySelect?: (dayNumber: number) => void
  className?: string
  showRoutes?: boolean
  transportMode?: 'walking' | 'driving' | 'cycling'
  mapStyle?: keyof typeof MAPBOX_CONFIG.STYLES
  onTransportModeChange?: (mode: 'walking' | 'driving' | 'cycling') => void
  onMapStyleChange?: (style: keyof typeof MAPBOX_CONFIG.STYLES) => void
  onToggleRoutes?: (show: boolean) => void
  lazy?: boolean
  enableClustering?: boolean
  enableOfflineMode?: boolean
  fallbackEnabled?: boolean
  performanceMode?: 'standard' | 'optimized' | 'low-data'
}

export function TravelMap({
  days,
  destinationCoords,
  selectedDay,
  onActivitySelect,
  onDaySelect,
  className = '',
  showRoutes = true,
  transportMode = 'walking',
  mapStyle = 'streets',
  onTransportModeChange,
  onMapStyleChange,
  onToggleRoutes,
  lazy = false,
  enableClustering: enableClusteringProp = true,
  enableOfflineMode = true,
  fallbackEnabled = true,
  performanceMode = 'standard'
}: TravelMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentZoom, setCurrentZoom] = useState(MAPBOX_CONFIG.DEFAULT_ZOOM)
  const [enableClustering, setEnableClustering] = useState(enableClusteringProp)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(!lazy)
  
  // Error handling and offline state
  const [loadingState, setLoadingState] = useState<MapLoadingState>({
    isLoading: false,
    error: null,
    retryCount: 0
  })
  const [isOffline, setIsOffline] = useState(false)
  const [offlineCoverage, setOfflineCoverage] = useState<number>(0)
  const [showFallback, setShowFallback] = useState(false)
  const [offlineStorage] = useState(() => new MapOfflineStorage())
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize offline storage
  useEffect(() => {
    if (enableOfflineMode && offlineStorage.isOfflineSupported()) {
      offlineStorage.initialize().catch(error => {
        console.warn('Failed to initialize offline storage:', error)
      })
    }
  }, [enableOfflineMode, offlineStorage])

  // Retry mechanism with error handling
  const retryMapOperation = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const retryFunction = MapErrorHandler.createRetryFunction(
      async () => {
        // Clear previous error state
        setLoadingState(prev => ({ ...prev, error: null, isLoading: true }))
        
        // Attempt to reinitialize map
        if (map.current) {
          map.current.remove()
          map.current = null
        }
        
        setIsMapLoaded(false)
        
        // Trigger map reinitialization
        setTimeout(() => {
          if (mapContainer.current && isIntersecting) {
            initializeMap()
          }
        }, 100)
        
        return Promise.resolve()
      },
      { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true }
    )

    try {
      await retryFunction(setLoadingState)
    } catch (error) {
      console.error('Map retry failed:', error)
    }
  }, [isIntersecting])

  // Enhanced coordinate validation
  const validateAndFilterCoordinates = useCallback((activities: Activity[]) => {
    return activities.filter(activity => {
      const { lat, lng } = activity.location.coordinates
      const validation = MapErrorHandler.validateCoordinates(lat, lng)
      
      if (!validation.valid) {
        console.warn(`Invalid coordinates for activity "${activity.name}": ${validation.error}`)
        return false
      }
      
      return true
    })
  }, [])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !mapContainer.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    observer.observe(mapContainer.current)

    return () => observer.disconnect()
  }, [lazy])

  // Initialize map with error handling
  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || map.current) return

    try {
      setLoadingState({ isLoading: true, error: null, retryCount: 0 })

      // Validate Mapbox token
      if (MAPBOX_CONFIG.ACCESS_TOKEN === "mock-mapbox-token") {
        throw new Error('Mapbox access token not configured. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.')
      } else if (!MAPBOX_CONFIG.ACCESS_TOKEN.startsWith('pk.')) {
        throw new Error('Invalid Mapbox token: Client-side apps need PUBLIC tokens (pk.*), not secret tokens (sk.*)')
      }
      
      mapboxgl.accessToken = MAPBOX_CONFIG.ACCESS_TOKEN

      // Check network connectivity for better error reporting
      const isConnected = await MapErrorHandler.checkNetworkConnectivity()
      if (!isConnected && !isOffline) {
        console.warn('Network connectivity issues detected')
      }

      // Calculate initial center with enhanced validation
      const getInitialCenter = (): [number, number] => {
        // First try to use valid activity coordinates
        if (days.length > 0) {
          const validActivities = days.flatMap(day => 
            validateAndFilterCoordinates(day.activities)
          )
          
          if (validActivities.length > 0) {
            const firstCoord = validActivities[0].location.coordinates
            console.log('🗺️ Map centering on validated activity coordinates:', [firstCoord.lng, firstCoord.lat])
            return [firstCoord.lng, firstCoord.lat]
          }
        }

        // If no valid activity coordinates, use trip destination coordinates
        if (destinationCoords) {
          const validation = MapErrorHandler.validateCoordinates(destinationCoords.lat, destinationCoords.lng)
          if (validation.valid) {
            console.log('🗺️ Map centering on trip destination coordinates:', [destinationCoords.lng, destinationCoords.lat])
            return [destinationCoords.lng, destinationCoords.lat]
          }
        }

        // Last resort: use default center
        console.log('🗺️ Map using default center (Paris) - no valid coordinates found')
        return MAPBOX_CONFIG.DEFAULT_CENTER
      }

      // Create map instance with error handling
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_CONFIG.STYLES[mapStyle],
        center: getInitialCenter(),
        zoom: MAPBOX_CONFIG.DEFAULT_ZOOM,
        attributionControl: false,
        performanceMetricsCollection: performanceMode === 'optimized'
      })

      // Map error event handlers
      map.current.on('error', (e) => {
        console.error('Mapbox GL error:', e.error)
        const mapError = MapErrorHandler.parseMapboxError(e.error)
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          error: mapError
        }))
      })

      // Map style error handler
      map.current.on('style.load', () => {
        console.log('Map style loaded successfully')
      })

      map.current.on('styleimagemissing', (e) => {
        console.warn('Missing style image:', e.id)
      })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add attribution
    map.current.addControl(
      new mapboxgl.AttributionControl({
        compact: true
      }),
      'bottom-right'
    )

    // Track zoom changes for clustering
    map.current.on('zoom', () => {
      if (map.current) {
        setCurrentZoom(map.current.getZoom())
      }
    })

    // Update markers on move end for clustering (debounced)
    let moveTimeout: NodeJS.Timeout
    map.current.on('moveend', () => {
      clearTimeout(moveTimeout)
      moveTimeout = setTimeout(() => {
        if (enableClustering) {
          updateMarkersWithClustering()
        }
      }, 100)
    })

      // Mark map as loaded and check offline availability
      map.current.on('load', async () => {
        console.log('Map loaded successfully')
        setIsMapLoaded(true)
        setLoadingState({ isLoading: false, error: null, retryCount: 0 })

        // Check offline coverage if enabled
        if (enableOfflineMode && offlineStorage.isOfflineSupported()) {
          try {
            const bounds = map.current!.getBounds()
            if (bounds) {
              const availability = await offlineStorage.checkOfflineAvailability(
                {
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest()
                },
                Math.floor(currentZoom)
              )
              setOfflineCoverage(availability.coverage)
            }
          } catch (error) {
            console.warn('Failed to check offline availability:', error)
          }
        }
      })

      // Performance optimization based on mode
      if (performanceMode === 'low-data') {
        map.current.setRenderWorldCopies(false)
      }

    } catch (error) {
      console.error('Failed to initialize map:', error)
      const mapError = MapErrorHandler.parseMapboxError(error)
      setLoadingState({
        isLoading: false,
        error: mapError,
        retryCount: 0
      })
    }
  }, [mapStyle, isIntersecting, validateAndFilterCoordinates, destinationCoords, days, currentZoom, enableOfflineMode, offlineStorage, performanceMode])

  // Initialize map effect
  useEffect(() => {
    if (!mapContainer.current || map.current || !isIntersecting) return
    initializeMap()

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [initializeMap, isIntersecting])

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    markers.current.forEach(marker => marker.remove())
    markers.current = []
  }, [])

  // Create marker element
  const createMarkerElement = useCallback((activity: Activity, dayIndex: number) => {
    const el = document.createElement('div')
    el.className = 'custom-marker'
    el.style.cssText = `
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${getMarkerColor(activity.type)};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      position: relative;
      transition: transform 0.2s ease;
    `

    // Add day number badge
    const badge = document.createElement('div')
    badge.textContent = (dayIndex + 1).toString()
    badge.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${getDayColor(dayIndex)};
      color: white;
      font-size: 10px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    `
    el.appendChild(badge)

    // Add activity type icon (simplified)
    const getActivityIcon = (type: string) => {
      switch (type) {
        case 'restaurant': return '🍽️'
        case 'attraction': return '🎯'
        case 'accommodation': return '🏨'
        case 'experience': return '⭐'
        case 'transportation': return '🚗'
        case 'shopping': return '🛍️'
        default: return '📍'
      }
    }

    const icon = document.createElement('span')
    icon.textContent = getActivityIcon(activity.type)
    icon.style.fontSize = '14px'
    el.appendChild(icon)

    // Hover effects
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.1)'
    })

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)'
    })

    return el
  }, [])

  // Add markers for activities with enhanced validation
  const addMarkers = useCallback(() => {
    if (!map.current) return

    clearMarkers()

    const allCoordinates: [number, number][] = []
    let invalidCoordinatesCount = 0

    days.forEach((day, dayIndex) => {
      // Skip if selectedDay is set and this isn't the selected day
      if (selectedDay !== undefined && selectedDay !== day.day) return

      // Use enhanced coordinate validation
      const validActivities = validateAndFilterCoordinates(day.activities)
      invalidCoordinatesCount += day.activities.length - validActivities.length

      validActivities.forEach(activity => {
        const coordinates: [number, number] = [
          activity.location.coordinates.lng,
          activity.location.coordinates.lat
        ]
        allCoordinates.push(coordinates)

        const markerElement = createMarkerElement(activity, dayIndex)

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat(coordinates)
          .addTo(map.current!)

        // Add click handler
        markerElement.addEventListener('click', (e) => {
          e.stopPropagation()
          setSelectedActivity(activity)
          
          // Get marker position for popup
          const rect = markerElement.getBoundingClientRect()
          const mapRect = mapContainer.current!.getBoundingClientRect()
          setPopupPosition({
            x: rect.left - mapRect.left + rect.width / 2,
            y: rect.top - mapRect.top
          })

          if (onActivitySelect) {
            onActivitySelect(activity)
          }
        })

        markers.current.push(marker)
      })
    })

    // Log coordinate validation results
    if (invalidCoordinatesCount > 0) {
      console.warn(`${invalidCoordinatesCount} activities skipped due to invalid coordinates`)
    }

    // Fit map to show all markers
    if (allCoordinates.length > 0) {
      const bounds = calculateBounds(allCoordinates)
      map.current!.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      })
    } else if (invalidCoordinatesCount > 0) {
      // If all coordinates were invalid, show fallback
      if (fallbackEnabled) {
        setShowFallback(true)
      }
    }

    // Preload tiles for offline use if enabled
    if (enableOfflineMode && allCoordinates.length > 0 && offlineStorage.isOfflineSupported()) {
      const center = allCoordinates[0]
      offlineStorage.preloadArea(
        { lat: center[1], lng: center[0] },
        currentZoom,
        1
      ).catch(error => {
        console.warn('Failed to preload tiles:', error)
      })
    }
  }, [days, selectedDay, createMarkerElement, onActivitySelect, clearMarkers, validateAndFilterCoordinates, fallbackEnabled, enableOfflineMode, offlineStorage, currentZoom])

  // Update markers with clustering
  const updateMarkersWithClustering = useCallback(() => {
    if (!map.current || !enableClustering) return

    clearMarkers()

    // Create points for clustering
    const points = mapClustering.createPoints(days, selectedDay)
    mapClustering.loadPoints(points)

    // Get current map bounds
    const bounds = map.current.getBounds()
    if (!bounds) return

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ]

    // Get clusters for current view
    const clusters = mapClustering.getClusters(bbox, Math.floor(currentZoom))

    clusters.forEach(cluster => {
      const [lng, lat] = cluster.geometry.coordinates

      if (cluster.properties.cluster) {
        // This is a cluster
        const clusterMarker = cluster as ClusterPoint
        const { cluster_id, point_count } = clusterMarker.properties

        const clusterElement = mapClustering.createClusterElement(
          point_count,
          cluster_id,
          (clusterId) => {
            // Zoom to cluster
            const expansionZoom = mapClustering.getClusterExpansionZoom(clusterId)
            map.current!.easeTo({
              center: [lng, lat],
              zoom: expansionZoom + 1
            })
          }
        )

        const marker = new mapboxgl.Marker(clusterElement)
          .setLngLat([lng, lat])
          .addTo(map.current!)

        markers.current.push(marker)
      } else {
        // This is an individual point
        const activityPoint = cluster as ActivityPoint
        const { activity, dayIndex } = activityPoint.properties

        const markerElement = createMarkerElement(activity, dayIndex)

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([lng, lat])
          .addTo(map.current!)

        // Add click handler
        markerElement.addEventListener('click', (e) => {
          e.stopPropagation()
          setSelectedActivity(activity)
          
          // Get marker position for popup
          const rect = markerElement.getBoundingClientRect()
          const mapRect = mapContainer.current!.getBoundingClientRect()
          setPopupPosition({
            x: rect.left - mapRect.left + rect.width / 2,
            y: rect.top - mapRect.top
          })

          if (onActivitySelect) {
            onActivitySelect(activity)
          }
        })

        markers.current.push(marker)
      }
    })
  }, [days, selectedDay, currentZoom, enableClustering, createMarkerElement, onActivitySelect, clearMarkers])

  // Add routes between activities
  const addRoutes = useCallback(async () => {
    if (!map.current || !showRoutes) return

    // Remove existing route layers
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route')
    }
    if (map.current.getSource('route')) {
      map.current.removeSource('route')
    }

    days.forEach(async (day, dayIndex) => {
      // Skip if selectedDay is set and this isn't the selected day
      if (selectedDay !== undefined && selectedDay !== day.day) return

      const validActivities = validateAndFilterCoordinates(day.activities)
      const coordinates = validActivities.map(activity => [
        activity.location.coordinates.lng,
        activity.location.coordinates.lat
      ] as [number, number])

      if (coordinates.length < 2) return

      try {
        // Validate transport mode for security
        if (!['walking', 'driving', 'cycling'].includes(transportMode)) {
          console.warn('Invalid transport mode detected:', transportMode);
          return;
        }
        
        // Create route using Mapbox Directions API
        const coordinateString = coordinates.map(coord => coord.join(',')).join(';')
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${transportMode}/${coordinateString}?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}&geometries=geojson&overview=full`
        )

        const data = await response.json()

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const routeId = `route-day-${day.day}`

          // Check if map still exists after async operation
          if (!map.current) return

          // Add route source
          if (!map.current.getSource(routeId)) {
            map.current!.addSource(routeId, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
              }
            })

            // Add route layer
            map.current!.addLayer({
              id: routeId,
              type: 'line',
              source: routeId,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': getDayColor(dayIndex),
                'line-width': 4,
                'line-opacity': 0.8
              }
            })
          }
        }
      } catch (error) {
        console.error('Error fetching route:', error)
      }
    })
  }, [days, selectedDay, showRoutes, transportMode])

  // Update markers when days or selectedDay changes
  useEffect(() => {
    if (!isMapLoaded) return
    
    if (enableClustering && currentZoom < 14) {
      updateMarkersWithClustering()
    } else {
      addMarkers()
    }
  }, [addMarkers, updateMarkersWithClustering, enableClustering, currentZoom, isMapLoaded])

  // Update routes when relevant props change
  useEffect(() => {
    if (showRoutes && isMapLoaded) {
      addRoutes()
    }
  }, [addRoutes, isMapLoaded])

  // Handle map style changes
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(MAPBOX_CONFIG.STYLES[mapStyle])
    }
  }, [mapStyle])

  // Close popup when clicking on map
  useEffect(() => {
    if (!map.current) return

    const handleMapClick = () => {
      setSelectedActivity(null)
      setPopupPosition(null)
    }

    map.current.on('click', handleMapClick)

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick)
      }
    }
  }, [])

  // Prepare coordinates for fallback options
  const fallbackCoordinates = days.flatMap(day => 
    validateAndFilterCoordinates(day.activities).map(activity => ({
      lat: activity.location.coordinates.lat,
      lng: activity.location.coordinates.lng,
      name: activity.name,
      type: activity.type
    }))
  )

  // Handle errors with fallback options
  if (loadingState.error) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <MapErrorDisplay
          error={loadingState.error}
          loadingState={loadingState}
          onRetry={retryMapOperation}
          onFallback={(type) => {
            if (type === 'static' || type === 'external' || type === 'coordinates') {
              setShowFallback(true)
            }
          }}
          coordinates={fallbackCoordinates}
          className="h-full"
        />
      </div>
    )
  }

  // Show fallback options
  if (showFallback && fallbackEnabled) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <MapFallbackOptions
          coordinates={fallbackCoordinates}
          onClose={() => setShowFallback(false)}
          className="h-full"
        />
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading State */}
      {(loadingState.isLoading || (!isMapLoaded && isIntersecting)) && (
        <MapLoadingDisplay
          message={loadingState.retryCount > 0 ? `Retrying... (${loadingState.retryCount}/3)` : 'Loading map...'}
          className="absolute inset-0 z-10"
        />
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <OfflineIndicator
          isOffline={isOffline}
          coverage={offlineCoverage}
          onSwitchToOnline={() => {
            setIsOffline(false)
            retryMapOperation()
          }}
          className="absolute top-4 left-4 z-20 max-w-xs"
        />
      )}

      {/* Lazy Loading Placeholder */}
      {!isIntersecting && (
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-lg mb-2 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Map will load when visible</p>
          </div>
        </div>
      )}

      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ display: isIntersecting ? 'block' : 'none' }}
      />
      
      {/* Map Controls - Only show when map is loaded */}
      {isMapLoaded && (
        <MapControls
        onStyleChange={(style) => {
          if (map.current) {
            map.current.setStyle(MAPBOX_CONFIG.STYLES[style])
          }
          if (onMapStyleChange) {
            onMapStyleChange(style)
          }
        }}
        onTransportModeChange={(mode) => {
          if (onTransportModeChange) {
            onTransportModeChange(mode)
          }
        }}
        currentStyle={mapStyle}
        currentTransportMode={transportMode}
        showRoutes={showRoutes}
        onToggleRoutes={(show) => {
          if (onToggleRoutes) {
            onToggleRoutes(show)
          }
        }}
        />
      )}

      {/* Activity Popup */}
      {selectedActivity && popupPosition && isMapLoaded && (
        <ActivityPopup
          activity={selectedActivity}
          position={popupPosition}
          onClose={() => {
            setSelectedActivity(null)
            setPopupPosition(null)
          }}
        />
      )}
    </div>
  )
}

export default TravelMap