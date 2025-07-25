"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_CONFIG, calculateBounds, getDayColor, getMarkerColor } from '@/lib/mapbox-config'
import { Activity, Day } from '@/lib/itinerary-validation'
import { MapControls } from './map-controls'
import { ActivityPopup } from './activity-popup'
import { mapClustering, type MapPoint, type ActivityPoint, type ClusterPoint } from '@/lib/map-clustering'

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css'

interface TravelMapProps {
  days: Day[]
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
}

export function TravelMap({
  days,
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
  enableClustering: enableClusteringProp = true
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !isIntersecting) return

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_CONFIG.ACCESS_TOKEN

    // Create map instance
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_CONFIG.STYLES[mapStyle],
      center: MAPBOX_CONFIG.DEFAULT_CENTER,
      zoom: MAPBOX_CONFIG.DEFAULT_ZOOM,
      attributionControl: false
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

    // Mark map as loaded
    map.current.on('load', () => {
      setIsMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [mapStyle, isIntersecting])

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

  // Add markers for activities
  const addMarkers = useCallback(() => {
    if (!map.current) return

    clearMarkers()

    const allCoordinates: [number, number][] = []

    days.forEach((day, dayIndex) => {
      // Skip if selectedDay is set and this isn't the selected day
      if (selectedDay !== undefined && selectedDay !== day.day) return

      day.activities.forEach(activity => {
        if (activity.location.coordinates.lat === 0 && activity.location.coordinates.lng === 0) {
          return // Skip invalid coordinates
        }

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

    // Fit map to show all markers
    if (allCoordinates.length > 0) {
      const bounds = calculateBounds(allCoordinates)
      map.current!.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      })
    }
  }, [days, selectedDay, createMarkerElement, onActivitySelect, clearMarkers])

  // Update markers with clustering
  const updateMarkersWithClustering = useCallback(() => {
    if (!map.current || !enableClustering) return

    clearMarkers()

    // Create points for clustering
    const points = mapClustering.createPoints(days, selectedDay)
    mapClustering.loadPoints(points)

    // Get current map bounds
    const bounds = map.current.getBounds()
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

      const coordinates = day.activities
        .filter(activity => 
          activity.location.coordinates.lat !== 0 && 
          activity.location.coordinates.lng !== 0
        )
        .map(activity => [
          activity.location.coordinates.lng,
          activity.location.coordinates.lat
        ] as [number, number])

      if (coordinates.length < 2) return

      try {
        // Create route using Mapbox Directions API
        const coordinateString = coordinates.map(coord => coord.join(',')).join(';')
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${transportMode}/${coordinateString}?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}&geometries=geojson&overview=full`
        )

        const data = await response.json()
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const routeId = `route-day-${day.day}`

          // Add route source
          if (!map.current!.getSource(routeId)) {
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

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading State */}
      {!isMapLoaded && isIntersecting && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
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