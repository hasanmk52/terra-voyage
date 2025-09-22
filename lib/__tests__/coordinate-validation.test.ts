/**
 * Coordinate Validation Tests
 * Tests for FR-008.1: Coordinate validation rules
 */

import { CoordinateValidator, CoordinateUtils, Coordinates } from '../coordinate-validation';

describe('CoordinateValidator', () => {
  describe('validate', () => {
    it('should validate correct coordinates', () => {
      const result = CoordinateValidator.validate({ lat: 48.8566, lng: 2.3522 });
      expect(result.valid).toBe(true);
      expect(result.accuracy).toBe('high');
    });

    it('should reject invalid latitude range', () => {
      const result = CoordinateValidator.validate({ lat: 91, lng: 2.3522 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Latitude must be between -90 and 90');
    });

    it('should reject invalid longitude range', () => {
      const result = CoordinateValidator.validate({ lat: 48.8566, lng: 181 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Longitude must be between -180 and 180');
    });

    it('should reject Null Island coordinates', () => {
      const result = CoordinateValidator.validate({ lat: 0, lng: 0 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Null Island');
    });

    it('should reject NaN coordinates', () => {
      const result = CoordinateValidator.validate({ lat: NaN, lng: 2.3522 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be NaN');
    });

    it('should reject non-number coordinates', () => {
      const result = CoordinateValidator.validate({ lat: '48.8566' as any, lng: 2.3522 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be numbers');
    });

    it('should warn about low precision coordinates', () => {
      const result = CoordinateValidator.validate({ lat: 48.8, lng: 2.3 });
      expect(result.valid).toBe(true);
      expect(result.accuracy).toBe('low');
      expect(result.warnings).toContain(
        'Low precision coordinates may not be accurate for city-level navigation'
      );
    });

    it('should warn about ocean coordinates', () => {
      const result = CoordinateValidator.validate({ lat: 25.0, lng: -140.0 });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Coordinates appear to be in ocean - verify this is correct for your destination'
      );
    });

    it('should warn about Arctic region', () => {
      const result = CoordinateValidator.validate({ lat: 75.0, lng: 10.0 });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Arctic region - extreme weather conditions and limited infrastructure'
      );
    });

    it('should warn about Antarctic region', () => {
      const result = CoordinateValidator.validate({ lat: -75.0, lng: 10.0 });
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Antarctic region - extreme weather conditions and limited access'
      );
    });

    it('should detect restricted areas', () => {
      // Area 51 coordinates
      const result = CoordinateValidator.validate({ lat: 37.15, lng: -115.85 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('restricted area');
    });
  });

  describe('normalize', () => {
    it('should normalize coordinates to 6 decimal places', () => {
      const result = CoordinateValidator.normalize({ lat: 48.85661234567, lng: 2.35221234567 });
      expect(result.lat).toBe(48.856612);
      expect(result.lng).toBe(2.352212);
    });

    it('should clamp latitude to valid range', () => {
      const result = CoordinateValidator.normalize({ lat: 95, lng: 2.3522 });
      expect(result.lat).toBe(90);
    });

    it('should normalize longitude to -180 to 180 range', () => {
      const result = CoordinateValidator.normalize({ lat: 48.8566, lng: 362.3522 });
      expect(result.lng).toBe(2.3522);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between coordinates', () => {
      const paris = { lat: 48.8566, lng: 2.3522 };
      const london = { lat: 51.5074, lng: -0.1278 };
      
      const distance = CoordinateValidator.calculateDistance(paris, london);
      expect(distance).toBeCloseTo(344, 0); // ~344 km
    });

    it('should return 0 for same coordinates', () => {
      const coords = { lat: 48.8566, lng: 2.3522 };
      const distance = CoordinateValidator.calculateDistance(coords, coords);
      expect(distance).toBe(0);
    });
  });

  describe('validatePrecision', () => {
    it('should validate city-level precision', () => {
      const result = CoordinateValidator.validatePrecision(
        { lat: 48.8566, lng: 2.3522 },
        'city'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject insufficient precision for building level', () => {
      const result = CoordinateValidator.validatePrecision(
        { lat: 48.85, lng: 2.35 },
        'building'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient precision');
    });

    it('should validate high precision for room level', () => {
      const result = CoordinateValidator.validatePrecision(
        { lat: 48.856612, lng: 2.352212 },
        'room'
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple coordinates', () => {
      const coordinates = [
        { lat: 48.8566, lng: 2.3522 },
        { lat: 51.5074, lng: -0.1278 },
        { lat: 0, lng: 0 } // Invalid
      ];

      const results = CoordinateValidator.validateBatch(coordinates);
      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(false);
    });
  });
});

describe('CoordinateUtils', () => {
  describe('format', () => {
    it('should format coordinates with default precision', () => {
      const formatted = CoordinateUtils.format({ lat: 48.8566, lng: 2.3522 });
      expect(formatted).toBe('48.856600, 2.352200');
    });

    it('should format coordinates with custom precision', () => {
      const formatted = CoordinateUtils.format({ lat: 48.8566, lng: 2.3522 }, 2);
      expect(formatted).toBe('48.86, 2.35');
    });
  });

  describe('parse', () => {
    it('should parse comma-separated coordinates', () => {
      const result = CoordinateUtils.parse('48.8566, 2.3522');
      expect(result).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('should parse coordinates with parentheses', () => {
      const result = CoordinateUtils.parse('(48.8566, 2.3522)');
      expect(result).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('should parse space-separated coordinates', () => {
      const result = CoordinateUtils.parse('48.8566 2.3522');
      expect(result).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('should return null for invalid format', () => {
      const result = CoordinateUtils.parse('invalid coordinates');
      expect(result).toBeNull();
    });

    it('should handle negative coordinates', () => {
      const result = CoordinateUtils.parse('-33.8688, 151.2093');
      expect(result).toEqual({ lat: -33.8688, lng: 151.2093 });
    });
  });

  describe('createBoundingBox', () => {
    it('should create bounding box from center and radius', () => {
      const center = { lat: 48.8566, lng: 2.3522 };
      const bounds = CoordinateUtils.createBoundingBox(center, 10); // 10km radius

      expect(bounds.north).toBeGreaterThan(center.lat);
      expect(bounds.south).toBeLessThan(center.lat);
      expect(bounds.east).toBeGreaterThan(center.lng);
      expect(bounds.west).toBeLessThan(center.lng);
    });
  });

  describe('isWithinBounds', () => {
    it('should check if coordinates are within bounds', () => {
      const bounds = {
        north: 49,
        south: 48,
        east: 3,
        west: 2
      };

      expect(CoordinateUtils.isWithinBounds({ lat: 48.5, lng: 2.5 }, bounds)).toBe(true);
      expect(CoordinateUtils.isWithinBounds({ lat: 50, lng: 2.5 }, bounds)).toBe(false);
      expect(CoordinateUtils.isWithinBounds({ lat: 48.5, lng: 4 }, bounds)).toBe(false);
    });
  });
});