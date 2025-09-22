/**
 * Coordinate Validation and Geocoding System
 * Implements FR-008: Coordinate Validation and Geocoding Backup Systems
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CoordinateValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  accuracy?: 'high' | 'medium' | 'low';
  source?: string;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RestrictedArea {
  name: string;
  bounds: BoundingBox;
  reason: string;
  severity: 'warning' | 'error';
}

// FR-008.1: Coordinate validation rules with geographic boundaries
const RESTRICTED_AREAS: RestrictedArea[] = [
  // Military bases and restricted zones
  {
    name: "Area 51",
    bounds: { north: 37.3, south: 37.0, east: -115.7, west: -116.0 },
    reason: "Military restricted area",
    severity: "error"
  },
  {
    name: "North Pole Research Area",
    bounds: { north: 90, south: 89.5, east: 180, west: -180 },
    reason: "Extreme environment, no tourist infrastructure",
    severity: "warning"
  },
  {
    name: "Antarctica Interior",
    bounds: { north: -80, south: -90, east: 180, west: -180 },
    reason: "Extreme environment, special permits required",
    severity: "warning"
  },
  // Disputed territories
  {
    name: "Kashmir Disputed Zone",
    bounds: { north: 37.0, south: 32.0, east: 80.0, west: 72.0 },
    reason: "Politically sensitive area",
    severity: "warning"
  }
];

// Major ocean areas (for land vs ocean validation)
const OCEAN_AREAS: BoundingBox[] = [
  // Pacific Ocean
  { north: 60, south: -60, east: -70, west: -180 },
  { north: 60, south: -60, east: 180, west: 120 },
  // Atlantic Ocean
  { north: 70, south: -60, east: -10, west: -80 },
  // Indian Ocean
  { north: 30, south: -60, east: 120, west: 20 },
  // Arctic Ocean
  { north: 90, south: 66, east: 180, west: -180 }
];

export class CoordinateValidator {
  /**
   * FR-008.1: Comprehensive coordinate validation
   */
  static validate(coordinates: Coordinates): CoordinateValidationResult {
    const { lat, lng } = coordinates;
    const warnings: string[] = [];

    // Basic type and NaN validation
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { valid: false, error: 'Coordinates must be numbers' };
    }

    if (isNaN(lat) || isNaN(lng)) {
      return { valid: false, error: 'Coordinates cannot be NaN' };
    }

    // Range validation (FR-008.1)
    if (lat < -90 || lat > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
    }

    if (lng < -180 || lng > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
    }

    // Null Island check
    if (lat === 0 && lng === 0) {
      return { valid: false, error: 'Invalid coordinates (0,0) - Null Island' };
    }

    // Check precision (FR-008.1: 4-6 decimal places for city-level accuracy)
    const latDecimals = this.getDecimalPlaces(lat);
    const lngDecimals = this.getDecimalPlaces(lng);
    
    let accuracy: 'high' | 'medium' | 'low' = 'high';
    if (latDecimals < 4 || lngDecimals < 4) {
      accuracy = 'low';
      warnings.push('Low precision coordinates may not be accurate for city-level navigation');
    } else if (latDecimals < 6 || lngDecimals < 6) {
      accuracy = 'medium';
    }

    // Geographic boundary validation
    const boundaryCheck = this.validateGeographicBoundaries(coordinates);
    if (!boundaryCheck.valid) {
      return boundaryCheck;
    }
    warnings.push(...(boundaryCheck.warnings || []));

    // Restricted area validation (FR-008.1)
    const restrictedCheck = this.checkRestrictedAreas(coordinates);
    if (!restrictedCheck.valid) {
      return restrictedCheck;
    }
    warnings.push(...(restrictedCheck.warnings || []));

    return {
      valid: true,
      accuracy,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate coordinates against known geographic boundaries
   */
  private static validateGeographicBoundaries(coordinates: Coordinates): CoordinateValidationResult {
    const { lat, lng } = coordinates;
    const warnings: string[] = [];

    // Check if coordinates fall in ocean (FR-008.1: land vs ocean validation)
    const isInOcean = this.isInOcean(coordinates);
    if (isInOcean) {
      warnings.push('Coordinates appear to be in ocean - verify this is correct for your destination');
    }

    // Extreme climate zones
    if (lat > 66.5) {
      warnings.push('Arctic region - extreme weather conditions and limited infrastructure');
    } else if (lat < -66.5) {
      warnings.push('Antarctic region - extreme weather conditions and limited access');
    }

    // Desert regions (basic check)
    if (this.isLikelyDesert(coordinates)) {
      warnings.push('Coordinates may be in desert region - verify infrastructure availability');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check if coordinates fall in restricted areas
   */
  private static checkRestrictedAreas(coordinates: Coordinates): CoordinateValidationResult {
    const { lat, lng } = coordinates;
    const warnings: string[] = [];

    for (const area of RESTRICTED_AREAS) {
      if (this.isInBounds(coordinates, area.bounds)) {
        if (area.severity === 'error') {
          return {
            valid: false,
            error: `Coordinates fall in restricted area: ${area.name}. ${area.reason}`
          };
        } else {
          warnings.push(`Warning: ${area.name} - ${area.reason}`);
        }
      }
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check if coordinates are in ocean
   */
  private static isInOcean(coordinates: Coordinates): boolean {
    return OCEAN_AREAS.some(ocean => this.isInBounds(coordinates, ocean));
  }

  /**
   * Basic desert region detection
   */
  private static isLikelyDesert(coordinates: Coordinates): boolean {
    const { lat, lng } = coordinates;
    
    // Sahara Desert
    if (lat >= 15 && lat <= 35 && lng >= -15 && lng <= 35) return true;
    
    // Arabian Desert
    if (lat >= 15 && lat <= 35 && lng >= 35 && lng <= 60) return true;
    
    // Gobi Desert
    if (lat >= 40 && lat <= 50 && lng >= 100 && lng <= 120) return true;
    
    // Australian Outback
    if (lat >= -35 && lat <= -15 && lng >= 115 && lng <= 155) return true;
    
    return false;
  }

  /**
   * Check if coordinates fall within bounding box
   */
  private static isInBounds(coordinates: Coordinates, bounds: BoundingBox): boolean {
    const { lat, lng } = coordinates;
    return lat >= bounds.south && lat <= bounds.north && 
           lng >= bounds.west && lng <= bounds.east;
  }

  /**
   * Get number of decimal places in a number
   */
  private static getDecimalPlaces(num: number): number {
    const str = num.toString();
    if (str.indexOf('.') === -1) return 0;
    return str.split('.')[1].length;
  }

  /**
   * Normalize coordinates to standard format
   */
  static normalize(coordinates: Coordinates): Coordinates {
    let { lat, lng } = coordinates;

    // Clamp latitude to valid range
    lat = Math.max(-90, Math.min(90, lat));

    // Normalize longitude to -180 to 180 range
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;

    // Round to 6 decimal places for consistency
    lat = Math.round(lat * 1000000) / 1000000;
    lng = Math.round(lng * 1000000) / 1000000;

    return { lat, lng };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Validate coordinate precision for different use cases
   */
  static validatePrecision(coordinates: Coordinates, requiredAccuracy: 'city' | 'building' | 'room'): CoordinateValidationResult {
    const latDecimals = this.getDecimalPlaces(coordinates.lat);
    const lngDecimals = this.getDecimalPlaces(coordinates.lng);
    
    const minDecimals = Math.min(latDecimals, lngDecimals);

    const requirements = {
      city: { decimals: 4, accuracy: '~11 meters' },
      building: { decimals: 5, accuracy: '~1 meter' },
      room: { decimals: 6, accuracy: '~0.1 meter' }
    };

    const required = requirements[requiredAccuracy];
    
    if (minDecimals < required.decimals) {
      return {
        valid: false,
        error: `Insufficient precision for ${requiredAccuracy}-level accuracy. Need ${required.decimals} decimal places (${required.accuracy}), got ${minDecimals}`
      };
    }

    return { valid: true, accuracy: 'high' };
  }

  /**
   * Batch validate multiple coordinates
   */
  static validateBatch(coordinatesList: Coordinates[]): CoordinateValidationResult[] {
    return coordinatesList.map(coords => this.validate(coords));
  }
}

/**
 * Utility functions for coordinate operations
 */
export const CoordinateUtils = {
  /**
   * Format coordinates for display
   */
  format(coordinates: Coordinates, precision: number = 6): string {
    const { lat, lng } = coordinates;
    return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
  },

  /**
   * Parse coordinates from string
   */
  parse(coordString: string): Coordinates | null {
    const cleanString = coordString.trim();
    
    // Try different formats: "lat,lng", "lat, lng", "(lat,lng)", etc.
    const patterns = [
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,
      /^\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)$/,
      /^(-?\d+\.?\d*)\s+(-?\d+\.?\d*)$/
    ];

    for (const pattern of patterns) {
      const match = cleanString.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }

    return null;
  },

  /**
   * Create bounding box from center point and radius
   */
  createBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
    const latDelta = radiusKm / 111; // ~111 km per degree latitude
    const lngDelta = radiusKm / (111 * Math.cos(CoordinateValidator['toRadians'](center.lat)));

    return {
      north: center.lat + latDelta,
      south: center.lat - latDelta,
      east: center.lng + lngDelta,
      west: center.lng - lngDelta
    };
  },

  /**
   * Check if coordinates are within bounding box
   */
  isWithinBounds(coordinates: Coordinates, bounds: BoundingBox): boolean {
    const { lat, lng } = coordinates;
    return lat >= bounds.south && lat <= bounds.north && 
           lng >= bounds.west && lng <= bounds.east;
  }
};