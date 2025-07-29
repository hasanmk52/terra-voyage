import { useMockMapbox } from "./selective-mocks";
import { mockMapFeatures, simulateDelay } from "./mock-data";

// Validate Mapbox token type
const validateMapboxToken = (token: string): boolean => {
  if (!token || token === "your-mapbox-token") return false;
  
  // Public tokens start with 'pk.' for client-side use
  if (!token.startsWith('pk.')) {
    console.error('❌ Mapbox Error: Client-side applications must use a PUBLIC access token (pk.*), not a secret token (sk.*)');
    console.error('📚 See: https://docs.mapbox.com/api/overview/#access-tokens-and-token-scopes');
    return false;
  }
  
  return true;
};

const rawToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const isValidToken = validateMapboxToken(rawToken);

export const MAPBOX_CONFIG = {
  ACCESS_TOKEN: useMockMapbox || !isValidToken
    ? "mock-mapbox-token"
    : rawToken,
  STYLES: {
    streets: "mapbox://styles/mapbox/streets-v12",
    satellite: "mapbox://styles/mapbox/satellite-v9",
    outdoors: "mapbox://styles/mapbox/outdoors-v12",
    light: "mapbox://styles/mapbox/light-v11",
    dark: "mapbox://styles/mapbox/dark-v11",
    navigation: "mapbox://styles/mapbox/navigation-day-v1"
  },
  DEFAULT_CENTER: [2.3522, 48.8566] as [number, number], // Paris, France
  DEFAULT_ZOOM: 12,
};

// Utility functions for map markers and styling
export const getMarkerColor = (activityType: string): string => {
  const colors = {
    restaurant: '#ef4444', // red
    attraction: '#3b82f6', // blue
    accommodation: '#10b981', // green
    experience: '#f59e0b', // amber
    transportation: '#6b7280', // gray
    shopping: '#8b5cf6', // purple
    default: '#6366f1' // indigo
  };
  
  return colors[activityType as keyof typeof colors] || colors.default;
};

export const getDayColor = (dayIndex: number): string => {
  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue  
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1'  // indigo
  ];
  
  return colors[dayIndex % colors.length];
};

export const calculateBounds = (coordinates: [number, number][]): [[number, number], [number, number]] => {
  if (coordinates.length === 0) {
    return [MAPBOX_CONFIG.DEFAULT_CENTER, MAPBOX_CONFIG.DEFAULT_CENTER];
  }
  
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];
  
  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  return [[minLng, minLat], [maxLng, maxLat]];
};

// Input validation helpers
const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
};

const sanitizeQuery = (query: string): string => {
  if (typeof query !== 'string') {
    throw new Error('Query must be a string');
  }
  // Remove potentially dangerous characters and limit length
  return query.trim().substring(0, 200).replace(/[<>]/g, '');
};

const validateTransportMode = (mode: string): mode is "driving" | "walking" | "cycling" => {
  return ['driving', 'walking', 'cycling'].includes(mode);
};

export class MapboxService {
  async getLocations(query: string) {
    // Input validation
    const sanitizedQuery = sanitizeQuery(query);
    if (!sanitizedQuery) {
      throw new Error('Invalid query parameter');
    }

    if (useMockMapbox) {
      await simulateDelay("maps");
      return {
        features: mockMapFeatures.filter(
          (feature) =>
            feature.properties.title
              .toLowerCase()
              .includes(sanitizedQuery.toLowerCase()) ||
            feature.properties.description
              .toLowerCase()
              .includes(sanitizedQuery.toLowerCase())
        ),
      };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        sanitizedQuery
      )}.json?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  async getDirections(
    origin: [number, number],
    destination: [number, number],
    mode: "driving" | "walking" | "cycling" = "driving"
  ) {
    // Input validation
    if (!isValidCoordinate(origin[1], origin[0])) {
      throw new Error('Invalid origin coordinates');
    }
    if (!isValidCoordinate(destination[1], destination[0])) {
      throw new Error('Invalid destination coordinates');
    }
    if (!validateTransportMode(mode)) {
      throw new Error('Invalid transport mode');
    }

    if (useMockMapbox) {
      await simulateDelay("maps");
      
      // Generate a more realistic route with multiple points
      const midPoint: [number, number] = [
        (origin[0] + destination[0]) / 2 + (Math.random() - 0.5) * 0.01,
        (origin[1] + destination[1]) / 2 + (Math.random() - 0.5) * 0.01
      ];
      
      // Calculate approximate distance and duration
      const distance = Math.sqrt(
        Math.pow(destination[0] - origin[0], 2) + 
        Math.pow(destination[1] - origin[1], 2)
      ) * 111000; // Rough conversion to meters
      
      const speedMultiplier = mode === 'walking' ? 5 : mode === 'cycling' ? 15 : 50; // km/h
      const duration = Math.round(distance / 1000 / speedMultiplier * 3600); // seconds
      
      return {
        routes: [
          {
            distance: Math.round(distance),
            duration: duration,
            geometry: {
              coordinates: [origin, midPoint, destination],
              type: "LineString",
            },
          },
        ],
      };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${mode}/${origin.join(
        ","
      )};${destination.join(",")}?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}&geometries=geojson&overview=full`
    );

    if (!response.ok) {
      throw new Error(`Mapbox Directions API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }
}
