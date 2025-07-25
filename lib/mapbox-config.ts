// Mapbox configuration and utilities
export const MAPBOX_CONFIG = {
  // Use a placeholder access token - in production, this would be from environment variables
  ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoidGVycmF2b3lhZ2UiLCJhIjoiY2x0ZXN0MTIzNDUiLCJzIjoiZGVmYXVsdCJ9.example_token',
  
  // Default map configuration
  DEFAULT_STYLE: 'mapbox://styles/mapbox/streets-v12',
  DEFAULT_CENTER: [-74.006, 40.7128] as [number, number], // NYC
  DEFAULT_ZOOM: 10,
  
  // Map styles for different themes
  STYLES: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12'
  },
  
  // Transportation modes for routing
  TRANSPORT_MODES: {
    walking: 'walking',
    driving: 'driving',
    cycling: 'cycling',
    public: 'driving' // Fallback to driving for public transport routes
  },
  
  // Marker colors for different activity types
  MARKER_COLORS: {
    accommodation: '#8B5CF6', // Purple
    restaurant: '#F59E0B',     // Amber
    attraction: '#EF4444',     // Red
    experience: '#10B981',     // Emerald
    transportation: '#3B82F6', // Blue
    shopping: '#EC4899',       // Pink
    other: '#6B7280'          // Gray
  },
  
  // Day colors for route visualization
  DAY_COLORS: [
    '#EF4444', // Red - Day 1
    '#F59E0B', // Amber - Day 2
    '#10B981', // Emerald - Day 3
    '#3B82F6', // Blue - Day 4
    '#8B5CF6', // Purple - Day 5
    '#EC4899', // Pink - Day 6
    '#F97316', // Orange - Day 7
    '#06B6D4', // Cyan - Day 8
    '#84CC16', // Lime - Day 9
    '#A855F7'  // Violet - Day 10
  ],
  
  // Clustering configuration
  CLUSTER_CONFIG: {
    clusterMaxZoom: 14,
    clusterRadius: 50,
    clusterMinPoints: 2
  }
}

// Utility functions
export function getMarkerColor(activityType: string): string {
  return MAPBOX_CONFIG.MARKER_COLORS[activityType as keyof typeof MAPBOX_CONFIG.MARKER_COLORS] || MAPBOX_CONFIG.MARKER_COLORS.other
}

export function getDayColor(dayIndex: number): string {
  return MAPBOX_CONFIG.DAY_COLORS[dayIndex % MAPBOX_CONFIG.DAY_COLORS.length]
}

export function createMapboxDirectionsUrl(
  coordinates: [number, number][],
  profile: string = 'walking'
): string {
  const coordinateString = coordinates.map(coord => coord.join(',')).join(';')
  return `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinateString}?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}&geometries=geojson&overview=full`
}

// Map bounds utility
export function calculateBounds(coordinates: [number, number][]): [[number, number], [number, number]] {
  if (coordinates.length === 0) {
    return [MAPBOX_CONFIG.DEFAULT_CENTER, MAPBOX_CONFIG.DEFAULT_CENTER]
  }
  
  const lngs = coordinates.map(coord => coord[0])
  const lats = coordinates.map(coord => coord[1])
  
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  
  // Add padding
  const padding = 0.01
  return [
    [minLng - padding, minLat - padding],
    [maxLng + padding, maxLat + padding]
  ]
}

// Geocoding utility for address to coordinates
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}&limit=1`
    )
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return [lng, lat]
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Reverse geocoding utility for coordinates to address
export async function reverseGeocode(coordinates: [number, number]): Promise<string | null> {
  try {
    const [lng, lat] = coordinates
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}&limit=1`
    )
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name
    }
    
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}