/**
 * Primary Geocoding Service with Backup Systems
 * Implements FR-008.2, FR-008.3: Primary and backup geocoding services
 */

import { CoordinateValidator, Coordinates, CoordinateValidationResult } from './coordinate-validation';
import { retryManagers } from './retry-logic';

export interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
  placeId?: string;
  accuracy: 'high' | 'medium' | 'low';
  source: 'google' | 'nominatim' | 'manual' | 'cache';
  components: {
    country?: string;
    adminArea?: string;
    locality?: string;
    postalCode?: string;
  };
  boundingBox?: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
}

export interface ReverseGeocodeResult {
  address: string;
  coordinates: Coordinates;
  accuracy: 'high' | 'medium' | 'low';
  source: 'google' | 'nominatim' | 'manual';
  components: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    adminArea?: string;
    country?: string;
    postalCode?: string;
  };
}

interface CachedGeocodeResult {
  result: GeocodeResult;
  timestamp: number;
  hits: number;
}

interface GeocodingStats {
  totalRequests: number;
  cacheHits: number;
  googleRequests: number;
  nominatimRequests: number;
  manualRequests: number;
  errors: number;
  averageResponseTime: number;
}

interface RateLimitInfo {
  requests: number[];
  windowStart: number;
}

// Manual coordinate database for popular destinations (FR-008.3)
const MANUAL_COORDINATES: Record<string, GeocodeResult> = {
  // Major cities with verified coordinates
  'paris': {
    coordinates: { lat: 48.8566, lng: 2.3522 },
    formattedAddress: 'Paris, France',
    accuracy: 'high',
    source: 'manual',
    components: { country: 'France', locality: 'Paris' }
  },
  'london': {
    coordinates: { lat: 51.5074, lng: -0.1278 },
    formattedAddress: 'London, United Kingdom',
    accuracy: 'high',
    source: 'manual',
    components: { country: 'United Kingdom', locality: 'London' }
  },
  'tokyo': {
    coordinates: { lat: 35.6762, lng: 139.6503 },
    formattedAddress: 'Tokyo, Japan',
    accuracy: 'high',
    source: 'manual',
    components: { country: 'Japan', locality: 'Tokyo' }
  },
  'new york': {
    coordinates: { lat: 40.7128, lng: -74.0060 },
    formattedAddress: 'New York, NY, USA',
    accuracy: 'high',
    source: 'manual',
    components: { country: 'United States', locality: 'New York', adminArea: 'New York' }
  },
  'sydney': {
    coordinates: { lat: -33.8688, lng: 151.2093 },
    formattedAddress: 'Sydney NSW, Australia',
    accuracy: 'high',
    source: 'manual',
    components: { country: 'Australia', locality: 'Sydney', adminArea: 'New South Wales' }
  }
};

export class GeocodingService {
  private cache: Map<string, CachedGeocodeResult> = new Map();
  private rateLimit: Map<string, RateLimitInfo> = new Map();
  private stats: GeocodingStats = {
    totalRequests: 0,
    cacheHits: 0,
    googleRequests: 0,
    nominatimRequests: 0,
    manualRequests: 0,
    errors: 0,
    averageResponseTime: 0
  };
  
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly GOOGLE_API_KEY: string;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

  constructor() {
    // SECURITY: Use server-side only environment variable to prevent API key exposure
    this.GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY || '';
  }

  /**
   * FR-008.2: Primary geocoding with Google Geocoding API
   * FR-008.3: Automatic fallback to backup services
   */
  async geocode(address: string): Promise<GeocodeResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Input validation and sanitization
      const sanitizedAddress = this.sanitizeAddress(address);
      if (!sanitizedAddress) {
        throw new Error('Invalid address input');
      }

      // SECURITY: Rate limiting check
      const clientId = this.getClientId(); // In production, use actual client identification
      if (!this.checkRateLimit(clientId)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Check cache first (FR-008.2: caching)
      const cached = this.getCachedResult(sanitizedAddress);
      if (cached) {
        this.stats.cacheHits++;
        this.updateStats(startTime);
        return { ...cached.result, source: 'cache' };
      }

      // Try primary Google Geocoding API
      if (this.GOOGLE_API_KEY) {
        try {
          const result = await this.geocodeWithGoogle(sanitizedAddress);
          this.cacheResult(sanitizedAddress, result);
          this.stats.googleRequests++;
          this.updateStats(startTime);
          return result;
        } catch (error) {
          console.warn('Google Geocoding failed, trying backup services:', error);
        }
      }

      // FR-008.3: Fallback to Nominatim
      try {
        const result = await this.geocodeWithNominatim(sanitizedAddress);
        this.cacheResult(sanitizedAddress, result);
        this.stats.nominatimRequests++;
        this.updateStats(startTime);
        return result;
      } catch (error) {
        console.warn('Nominatim geocoding failed, trying manual database:', error);
      }

      // FR-008.3: Final fallback to manual database
      const manualResult = this.geocodeWithManual(sanitizedAddress);
      if (manualResult) {
        this.stats.manualRequests++;
        this.updateStats(startTime);
        return manualResult;
      }

      throw new Error('All geocoding services failed');

    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  /**
   * Primary Google Geocoding API implementation
   */
  private async geocodeWithGoogle(address: string): Promise<GeocodeResult> {
    return retryManagers.maps.execute(async () => {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.GOOGLE_API_KEY}`,
        {
          headers: {
            'User-Agent': 'TerraVoyage/1.0',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Google Geocoding API key invalid or quota exceeded');
        }
        throw new Error(`Google Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        throw new Error('No results found');
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('Google Geocoding quota exceeded');
      }

      if (data.status !== 'OK') {
        throw new Error(`Google Geocoding error: ${data.status}`);
      }

      const result = data.results[0];
      const coordinates: Coordinates = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      };

      // Validate coordinates
      const validation = CoordinateValidator.validate(coordinates);
      if (!validation.valid) {
        throw new Error(`Invalid coordinates from Google: ${validation.error}`);
      }

      // Extract address components
      const components = this.extractGoogleComponents(result.address_components);

      return {
        coordinates: CoordinateValidator.normalize(coordinates),
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        accuracy: this.determineGoogleAccuracy(result.geometry.location_type),
        source: 'google',
        components,
        boundingBox: result.geometry.bounds ? {
          northeast: {
            lat: result.geometry.bounds.northeast.lat,
            lng: result.geometry.bounds.northeast.lng
          },
          southwest: {
            lat: result.geometry.bounds.southwest.lat,
            lng: result.geometry.bounds.southwest.lng
          }
        } : undefined
      };
    });
  }

  /**
   * FR-008.3: Backup geocoding with OpenStreetMap Nominatim
   */
  private async geocodeWithNominatim(address: string): Promise<GeocodeResult> {
    return retryManagers.maps.execute(async () => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TerraVoyage/1.0 (contact@terravoyage.com)',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout for Nominatim
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error('No results found in Nominatim');
      }

      const result = data[0];
      const coordinates: Coordinates = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };

      // Validate coordinates
      const validation = CoordinateValidator.validate(coordinates);
      if (!validation.valid) {
        throw new Error(`Invalid coordinates from Nominatim: ${validation.error}`);
      }

      // Extract address components
      const components = this.extractNominatimComponents(result.address);

      return {
        coordinates: CoordinateValidator.normalize(coordinates),
        formattedAddress: result.display_name,
        accuracy: this.determineNominatimAccuracy(result.class, result.type),
        source: 'nominatim',
        components,
        boundingBox: result.boundingbox ? {
          northeast: {
            lat: parseFloat(result.boundingbox[1]),
            lng: parseFloat(result.boundingbox[3])
          },
          southwest: {
            lat: parseFloat(result.boundingbox[0]),
            lng: parseFloat(result.boundingbox[2])
          }
        } : undefined
      };
    });
  }

  /**
   * FR-008.3: Manual coordinate database fallback
   */
  private geocodeWithManual(address: string): GeocodeResult | null {
    const normalizedAddress = address.toLowerCase().trim();
    
    // Direct lookup
    if (MANUAL_COORDINATES[normalizedAddress]) {
      return MANUAL_COORDINATES[normalizedAddress];
    }

    // Fuzzy matching for partial matches
    for (const [key, result] of Object.entries(MANUAL_COORDINATES)) {
      if (normalizedAddress.includes(key) || key.includes(normalizedAddress)) {
        return result;
      }
    }

    return null;
  }

  /**
   * Reverse geocoding: coordinates to address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<ReverseGeocodeResult> {
    // Validate input coordinates
    const validation = CoordinateValidator.validate(coordinates);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    const { lat, lng } = coordinates;

    // Try Google first
    if (this.GOOGLE_API_KEY) {
      try {
        return await this.reverseGeocodeWithGoogle(coordinates);
      } catch (error) {
        console.warn('Google reverse geocoding failed, trying Nominatim:', error);
      }
    }

    // Fallback to Nominatim
    return await this.reverseGeocodeWithNominatim(coordinates);
  }

  /**
   * Google reverse geocoding
   */
  private async reverseGeocodeWithGoogle(coordinates: Coordinates): Promise<ReverseGeocodeResult> {
    const { lat, lng } = coordinates;
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.GOOGLE_API_KEY}`,
      {
        headers: { 'User-Agent': 'TerraVoyage/1.0' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      throw new Error(`Google reverse geocoding error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error('No address found for coordinates');
    }

    const result = data.results[0];
    const components = this.extractGoogleReverseComponents(result.address_components);

    return {
      address: result.formatted_address,
      coordinates,
      accuracy: this.determineGoogleAccuracy(result.geometry.location_type),
      source: 'google',
      components
    };
  }

  /**
   * Nominatim reverse geocoding
   */
  private async reverseGeocodeWithNominatim(coordinates: Coordinates): Promise<ReverseGeocodeResult> {
    const { lat, lng } = coordinates;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TerraVoyage/1.0 (contact@terravoyage.com)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocoding error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.display_name) {
      throw new Error('No address found for coordinates');
    }

    const components = this.extractNominatimReverseComponents(data.address);

    return {
      address: data.display_name,
      coordinates,
      accuracy: this.determineNominatimAccuracy(data.class, data.type),
      source: 'nominatim',
      components
    };
  }

  // Helper methods for extracting address components
  private extractGoogleComponents(addressComponents: any[]): GeocodeResult['components'] {
    const components: GeocodeResult['components'] = {};
    
    for (const component of addressComponents) {
      const types = component.types;
      
      if (types.includes('country')) {
        components.country = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        components.adminArea = component.long_name;
      } else if (types.includes('locality')) {
        components.locality = component.long_name;
      } else if (types.includes('postal_code')) {
        components.postalCode = component.long_name;
      }
    }
    
    return components;
  }

  private extractNominatimComponents(address: any): GeocodeResult['components'] {
    return {
      country: address?.country,
      adminArea: address?.state || address?.region,
      locality: address?.city || address?.town || address?.village,
      postalCode: address?.postcode
    };
  }

  private extractGoogleReverseComponents(addressComponents: any[]): ReverseGeocodeResult['components'] {
    const components: ReverseGeocodeResult['components'] = {};
    
    for (const component of addressComponents) {
      const types = component.types;
      
      if (types.includes('street_number')) {
        components.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        components.route = component.long_name;
      } else if (types.includes('locality')) {
        components.locality = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        components.adminArea = component.long_name;
      } else if (types.includes('country')) {
        components.country = component.long_name;
      } else if (types.includes('postal_code')) {
        components.postalCode = component.long_name;
      }
    }
    
    return components;
  }

  private extractNominatimReverseComponents(address: any): ReverseGeocodeResult['components'] {
    return {
      streetNumber: address?.house_number,
      route: address?.road || address?.street,
      locality: address?.city || address?.town || address?.village,
      adminArea: address?.state || address?.region,
      country: address?.country,
      postalCode: address?.postcode
    };
  }

  // Accuracy determination methods
  private determineGoogleAccuracy(locationType: string): 'high' | 'medium' | 'low' {
    switch (locationType) {
      case 'ROOFTOP':
        return 'high';
      case 'RANGE_INTERPOLATED':
        return 'medium';
      case 'GEOMETRIC_CENTER':
      case 'APPROXIMATE':
      default:
        return 'low';
    }
  }

  private determineNominatimAccuracy(osm_class: string, type: string): 'high' | 'medium' | 'low' {
    if (osm_class === 'building' || type === 'house') {
      return 'high';
    } else if (osm_class === 'highway' || type === 'residential') {
      return 'medium';
    }
    return 'low';
  }

  // Cache management
  private getCachedResult(address: string): CachedGeocodeResult | null {
    const cached = this.cache.get(address.toLowerCase());
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(address.toLowerCase());
      return null;
    }

    // Update hit count
    cached.hits++;
    return cached;
  }

  private cacheResult(address: string, result: GeocodeResult): void {
    const key = address.toLowerCase();
    
    // Manage cache size
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < Math.floor(this.MAX_CACHE_SIZE * 0.1); i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0
    });
  }

  // Utility methods
  private sanitizeAddress(address: string): string {
    if (typeof address !== 'string') {
      throw new Error('Address must be a string');
    }
    
    // SECURITY: Comprehensive input sanitization
    const sanitized = address
      .trim()
      .substring(0, 500) // Limit length to prevent DoS
      .replace(/[<>"\\/&;$`|]/g, '') // Remove dangerous characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,#()]/g, ''); // Allow only safe address characters
    
    if (!sanitized || sanitized.length < 2) {
      throw new Error('Address too short or contains only invalid characters');
    }
    
    return sanitized;
  }

  private updateStats(startTime: number): void {
    const duration = Date.now() - startTime;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + duration) / this.stats.totalRequests;
  }

  // Public methods for monitoring
  getStats(): GeocodingStats {
    return { ...this.stats };
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: this.stats.totalRequests > 0 ? this.stats.cacheHits / this.stats.totalRequests : 0,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // SECURITY: Rate limiting methods
  private getClientId(): string {
    // In production, this should be based on actual client identification
    // (IP address, user ID, API key, etc.)
    return 'default';
  }

  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const rateInfo = this.rateLimit.get(clientId);

    if (!rateInfo) {
      this.rateLimit.set(clientId, {
        requests: [now],
        windowStart: now
      });
      return true;
    }

    // Clean old requests outside the window
    const windowStart = now - this.RATE_LIMIT_WINDOW;
    rateInfo.requests = rateInfo.requests.filter(time => time > windowStart);

    // Check if under limit
    if (rateInfo.requests.length >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    // Add current request
    rateInfo.requests.push(now);
    this.rateLimit.set(clientId, rateInfo);
    return true;
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();