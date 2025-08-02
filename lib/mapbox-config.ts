
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
  ACCESS_TOKEN: !isValidToken
    ? ""
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

    if (!MAPBOX_CONFIG.ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          sanitizedQuery
        )}.json?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}`,
        {
          // No timeout - let it complete
          headers: {
            'User-Agent': 'TerraVoyage/1.0',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        if (response.status === 401) {
          throw new Error(`Mapbox authentication failed. Please check your NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is valid.`);
        } else if (response.status === 403) {
          throw new Error(`Mapbox access denied. Your API key may not have geocoding permissions.`);
        } else if (response.status === 429) {
          throw new Error(`Mapbox rate limit exceeded. Please try again in a moment.`);
        } else {
          throw new Error(`Mapbox API error (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      console.log(`✅ Mapbox found ${data.features?.length || 0} locations for "${sanitizedQuery}"`);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw with our detailed message
      }
      throw new Error(`Network error connecting to Mapbox: ${error}`);
    }
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

    if (!MAPBOX_CONFIG.ACCESS_TOKEN) {
      throw new Error('Mapbox access token not configured. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.');
    }

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
