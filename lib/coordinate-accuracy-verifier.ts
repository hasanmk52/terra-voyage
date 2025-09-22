/**
 * Coordinate Accuracy Verification System
 * Implements FR-008.4: Coordinate accuracy verification and cross-referencing
 */

import { Coordinates, CoordinateValidator } from './coordinate-validation';
import { geocodingService, GeocodeResult } from './geocoding-service';

export interface AccuracyVerificationResult {
  isAccurate: boolean;
  confidence: number; // 0-1 scale
  issues: AccuracyIssue[];
  recommendations: string[];
  verifiedCoordinates?: Coordinates;
  sources: string[];
}

export interface AccuracyIssue {
  type: 'suspicious_location' | 'coordinate_mismatch' | 'precision_low' | 'boundary_violation' | 'data_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedValue?: string | number | Coordinates;
  expectedValue?: string | number | Coordinates;
}

export interface LocationReport {
  coordinates: Coordinates;
  address: string;
  reportedBy: string;
  reportedAt: Date;
  issueType: 'incorrect_coordinates' | 'outdated_address' | 'place_closed' | 'access_restricted';
  description: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface CoordinateCorrection {
  originalCoordinates: Coordinates;
  correctedCoordinates: Coordinates;
  source: string;
  confidence: number;
  appliedAt: Date;
  verifiedBy?: string;
}

interface CachedVerificationResult {
  result: AccuracyVerificationResult;
  timestamp: number;
}

// Known problematic coordinate patterns
interface SuspiciousCoordinatePattern {
  lat: number;
  lng: number;
  reason: string;
}

interface SuspiciousPattern {
  pattern: string;
  reason: string;
}

const SUSPICIOUS_COORDINATE_PATTERNS: SuspiciousCoordinatePattern[] = [
  // Common default/placeholder coordinates
  { lat: 0, lng: 0, reason: 'Null Island - likely placeholder' },
  { lat: 37.7749, lng: -122.4194, reason: 'SF default coordinates - check if actually in SF' },
  { lat: 40.7128, lng: -74.0060, reason: 'NYC default coordinates - check if actually in NYC' },
  { lat: 51.5074, lng: -0.1278, reason: 'London default coordinates - check if actually in London' }
];

const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  // Suspiciously rounded coordinates
  { pattern: 'rounded', reason: 'Suspiciously rounded coordinates may be approximate' }
];

// Reference locations for distance-based verification
const REFERENCE_LOCATIONS = [
  { name: 'Times Square, NYC', coordinates: { lat: 40.7580, lng: -73.9855 } },
  { name: 'Big Ben, London', coordinates: { lat: 51.4994, lng: -0.1245 } },
  { name: 'Eiffel Tower, Paris', coordinates: { lat: 48.8584, lng: 2.2945 } },
  { name: 'Sydney Opera House', coordinates: { lat: -33.8568, lng: 151.2153 } },
  { name: 'Tokyo Station', coordinates: { lat: 35.6812, lng: 139.7671 } }
];

export class CoordinateAccuracyVerifier {
  private locationReports: Map<string, LocationReport[]> = new Map();
  private coordinateCorrections: Map<string, CoordinateCorrection> = new Map();
  private verificationCache: Map<string, CachedVerificationResult> = new Map();
  
  /**
   * FR-008.4: Cross-reference coordinates with multiple data sources
   */
  async verifyCoordinateAccuracy(
    coordinates: Coordinates,
    expectedAddress?: string,
    sources: string[] = ['google', 'nominatim']
  ): Promise<AccuracyVerificationResult> {
    const cacheKey = this.getCacheKey(coordinates, expectedAddress);
    
    // Check cache
    const cached = this.verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.result;
    }

    const issues: AccuracyIssue[] = [];
    const recommendations: string[] = [];
    const usedSources: string[] = [];
    let confidence = 1.0;

    try {
      // Basic coordinate validation
      const basicValidation = CoordinateValidator.validate(coordinates);
      if (!basicValidation.valid) {
        issues.push({
          type: 'boundary_violation',
          severity: 'critical',
          description: basicValidation.error || 'Invalid coordinates'
        });
        confidence = 0;
      }

      // Check for suspicious patterns
      const suspiciousCheck = this.checkSuspiciousPatterns(coordinates);
      if (suspiciousCheck.length > 0) {
        issues.push(...suspiciousCheck);
        confidence -= 0.3;
      }

      // Cross-reference with geocoding services
      const geocodingVerification = await this.verifyWithGeocodingServices(
        coordinates, 
        expectedAddress, 
        sources
      );
      issues.push(...geocodingVerification.issues);
      usedSources.push(...geocodingVerification.sources);
      confidence = Math.min(confidence, geocodingVerification.confidence);

      // Check against reported issues
      const reportedIssues = this.checkReportedIssues(coordinates);
      if (reportedIssues.length > 0) {
        issues.push(...reportedIssues);
        confidence -= 0.2;
        recommendations.push('Location has reported accuracy issues - verify manually');
      }

      // Distance-based verification for major cities
      const distanceVerification = this.verifyWithReferenceLocations(coordinates, expectedAddress);
      if (distanceVerification) {
        issues.push(distanceVerification);
        confidence -= 0.15;
      }

      // Check for coordinate corrections
      const correction = this.getCoordinateCorrection(coordinates);
      let verifiedCoordinates = coordinates;
      if (correction) {
        verifiedCoordinates = correction.correctedCoordinates;
        confidence = Math.max(confidence, correction.confidence);
        recommendations.push('Using previously verified coordinates');
        usedSources.push(`correction_${correction.source}`);
      }

      // Generate recommendations based on issues
      this.generateRecommendations(issues, recommendations);

      const result: AccuracyVerificationResult = {
        isAccurate: confidence >= 0.7 && issues.filter(i => i.severity === 'critical').length === 0,
        confidence: Math.max(0, Math.min(1, confidence)),
        issues,
        recommendations,
        verifiedCoordinates: verifiedCoordinates !== coordinates ? verifiedCoordinates : undefined,
        sources: usedSources
      };

      // Cache result
      this.verificationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;

    } catch (error) {
      console.error('Coordinate verification failed:', error);
      
      return {
        isAccurate: false,
        confidence: 0,
        issues: [{
          type: 'data_conflict',
          severity: 'high',
          description: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        recommendations: ['Manual verification required due to system error'],
        sources: []
      };
    }
  }

  /**
   * Verify coordinates using multiple geocoding services
   */
  private async verifyWithGeocodingServices(
    coordinates: Coordinates,
    expectedAddress?: string,
    sources: string[] = ['google', 'nominatim']
  ): Promise<{ issues: AccuracyIssue[], confidence: number, sources: string[] }> {
    const issues: AccuracyIssue[] = [];
    const usedSources: string[] = [];
    let confidence = 1.0;

    try {
      // Reverse geocode to get address
      const reverseResult = await geocodingService.reverseGeocode(coordinates);
      usedSources.push(reverseResult.source);

      // If expected address provided, compare
      if (expectedAddress) {
        const similarity = this.calculateAddressSimilarity(
          reverseResult.address.toLowerCase(),
          expectedAddress.toLowerCase()
        );

        if (similarity < 0.5) {
          issues.push({
            type: 'coordinate_mismatch',
            severity: 'medium',
            description: 'Coordinates do not match expected address',
            detectedValue: reverseResult.address,
            expectedValue: expectedAddress
          });
          confidence -= 0.3;
        }
      }

      // Forward geocode the address to verify coordinates
      if (reverseResult.address) {
        try {
          const forwardResult = await geocodingService.geocode(reverseResult.address);
          usedSources.push(forwardResult.source);

          const distance = CoordinateValidator.calculateDistance(coordinates, forwardResult.coordinates);
          
          // Allow some tolerance based on accuracy
          const tolerance = forwardResult.accuracy === 'high' ? 0.1 : 
                          forwardResult.accuracy === 'medium' ? 0.5 : 1.0;

          if (distance > tolerance) {
            issues.push({
              type: 'coordinate_mismatch',
              severity: distance > 2 ? 'high' : 'medium',
              description: `Coordinate round-trip verification failed. Distance: ${distance.toFixed(2)}km`,
              detectedValue: forwardResult.coordinates,
              expectedValue: coordinates
            });
            confidence -= distance > 2 ? 0.4 : 0.2;
          }
        } catch (error) {
          // Forward geocoding failed - not necessarily an error
          console.warn('Forward geocoding verification failed:', error);
        }
      }

      // Check accuracy level
      if (reverseResult.accuracy === 'low') {
        issues.push({
          type: 'precision_low',
          severity: 'low',
          description: 'Low accuracy coordinates detected'
        });
        confidence -= 0.1;
      }

    } catch (error) {
      issues.push({
        type: 'data_conflict',
        severity: 'medium',
        description: 'Unable to verify coordinates with geocoding services'
      });
      confidence -= 0.4;
    }

    return { issues, confidence, sources: usedSources };
  }

  /**
   * Check for suspicious coordinate patterns
   */
  private checkSuspiciousPatterns(coordinates: Coordinates): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];
    const { lat, lng } = coordinates;

    // Check against known suspicious coordinate patterns
    for (const pattern of SUSPICIOUS_COORDINATE_PATTERNS) {
      const distance = CoordinateValidator.calculateDistance(coordinates, pattern);
      if (distance < 0.01) { // Within 10 meters
        issues.push({
          type: 'suspicious_location',
          severity: 'high',
          description: pattern.reason
        });
      }
    }

    // Check for suspiciously rounded coordinates
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.pattern === 'rounded') {
        const latDecimals = this.getDecimalPlaces(lat);
        const lngDecimals = this.getDecimalPlaces(lng);
        
        if ((latDecimals <= 2 && lngDecimals <= 2) || 
            (lat % 1 === 0 && lng % 1 === 0)) {
          issues.push({
            type: 'suspicious_location',
            severity: 'medium',
            description: pattern.reason
          });
        }
      }
    }

    return issues;
  }

  /**
   * Verify coordinates against reference locations for major cities
   */
  private verifyWithReferenceLocations(coordinates: Coordinates, expectedAddress?: string): AccuracyIssue | null {
    if (!expectedAddress) return null;

    const addressLower = expectedAddress.toLowerCase();
    
    for (const ref of REFERENCE_LOCATIONS) {
      const cityName = ref.name.split(',')[1]?.trim().toLowerCase() || ref.name.toLowerCase();
      
      if (addressLower.includes(cityName.replace(/[^a-z]/g, ''))) {
        const distance = CoordinateValidator.calculateDistance(coordinates, ref.coordinates);
        
        // Major cities should be within reasonable distance of landmarks
        if (distance > 50) { // 50km tolerance for city boundaries
          return {
            type: 'coordinate_mismatch',
            severity: 'medium',
            description: `Coordinates are ${distance.toFixed(1)}km from expected city center`,
            detectedValue: coordinates,
            expectedValue: ref.coordinates
          };
        }
      }
    }

    return null;
  }

  /**
   * FR-008.5: Check for reported coordinate issues
   */
  private checkReportedIssues(coordinates: Coordinates): AccuracyIssue[] {
    const issues: AccuracyIssue[] = [];
    const key = this.getCoordinateKey(coordinates);
    const reports = this.locationReports.get(key) || [];

    const activeReports = reports.filter(r => r.status === 'pending' || r.status === 'verified');
    
    if (activeReports.length > 0) {
      issues.push({
        type: 'data_conflict',
        severity: activeReports.some(r => r.status === 'verified') ? 'high' : 'medium',
        description: `${activeReports.length} accuracy issue(s) reported for this location`
      });
    }

    return issues;
  }

  /**
   * FR-008.6: Report incorrect locations for correction
   */
  reportLocationIssue(
    coordinates: Coordinates,
    address: string,
    reportedBy: string,
    issueType: LocationReport['issueType'],
    description: string
  ): void {
    const key = this.getCoordinateKey(coordinates);
    const reports = this.locationReports.get(key) || [];
    
    reports.push({
      coordinates,
      address,
      reportedBy,
      reportedAt: new Date(),
      issueType,
      description,
      status: 'pending'
    });
    
    this.locationReports.set(key, reports);
    
    // Clear verification cache for this location
    this.clearCacheForCoordinate(coordinates);
  }

  /**
   * FR-008.5: Apply coordinate correction
   */
  applyCoordinateCorrection(
    originalCoordinates: Coordinates,
    correctedCoordinates: Coordinates,
    source: string,
    confidence: number,
    verifiedBy?: string
  ): void {
    const key = this.getCoordinateKey(originalCoordinates);
    
    this.coordinateCorrections.set(key, {
      originalCoordinates,
      correctedCoordinates,
      source,
      confidence,
      appliedAt: new Date(),
      verifiedBy
    });
    
    // Clear verification cache
    this.clearCacheForCoordinate(originalCoordinates);
  }

  /**
   * Get coordinate correction if available
   */
  private getCoordinateCorrection(coordinates: Coordinates): CoordinateCorrection | null {
    const key = this.getCoordinateKey(coordinates);
    return this.coordinateCorrections.get(key) || null;
  }

  /**
   * Generate recommendations based on detected issues
   */
  private generateRecommendations(issues: AccuracyIssue[], recommendations: string[]): void {
    const hasHighSeverity = issues.some(i => i.severity === 'high' || i.severity === 'critical');
    const hasMediumSeverity = issues.some(i => i.severity === 'medium');
    const hasCoordinateMismatch = issues.some(i => i.type === 'coordinate_mismatch');
    const hasSuspiciousLocation = issues.some(i => i.type === 'suspicious_location');

    if (hasHighSeverity) {
      recommendations.push('Manual verification required due to high-severity issues');
    }

    if (hasCoordinateMismatch) {
      recommendations.push('Cross-reference with multiple sources before using');
    }

    if (hasSuspiciousLocation) {
      recommendations.push('Verify coordinates are not placeholder values');
    }

    if (hasMediumSeverity && !hasHighSeverity) {
      recommendations.push('Additional verification recommended');
    }

    if (issues.length === 0) {
      recommendations.push('Coordinates appear accurate and reliable');
    }
  }

  // Utility methods
  private calculateAddressSimilarity(address1: string, address2: string): number {
    // Simple similarity calculation - can be enhanced with fuzzy matching
    const words1 = address1.split(/\s+/).filter(w => w.length > 2);
    const words2 = address2.split(/\s+/).filter(w => w.length > 2);
    
    const commonWords = words1.filter(w1 => words2.some(w2 => w2.includes(w1) || w1.includes(w2)));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private getDecimalPlaces(num: number): number {
    const str = num.toString();
    if (str.indexOf('.') === -1) return 0;
    return str.split('.')[1].length;
  }

  private getCoordinateKey(coordinates: Coordinates): string {
    // Round to 6 decimal places for consistent keys
    const lat = Math.round(coordinates.lat * 1000000) / 1000000;
    const lng = Math.round(coordinates.lng * 1000000) / 1000000;
    return `${lat},${lng}`;
  }

  private getCacheKey(coordinates: Coordinates, address?: string): string {
    return `${this.getCoordinateKey(coordinates)}_${address || 'no_address'}`;
  }

  private clearCacheForCoordinate(coordinates: Coordinates): void {
    const key = this.getCoordinateKey(coordinates);
    for (const cacheKey of Array.from(this.verificationCache.keys())) {
      if (cacheKey.startsWith(key)) {
        this.verificationCache.delete(cacheKey);
      }
    }
  }

  // Public methods for reporting and management
  getLocationReports(coordinates: Coordinates): LocationReport[] {
    const key = this.getCoordinateKey(coordinates);
    return this.locationReports.get(key) || [];
  }

  updateReportStatus(coordinates: Coordinates, reportIndex: number, status: LocationReport['status']): void {
    const key = this.getCoordinateKey(coordinates);
    const reports = this.locationReports.get(key);
    
    if (reports && reports[reportIndex]) {
      reports[reportIndex].status = status;
      this.locationReports.set(key, reports);
    }
  }

  getVerificationStats() {
    const totalReports = Array.from(this.locationReports.values()).reduce((sum, reports) => sum + reports.length, 0);
    const totalCorrections = this.coordinateCorrections.size;
    const cacheSize = this.verificationCache.size;

    return {
      totalReports,
      totalCorrections,
      cacheSize,
      reportsByStatus: this.getReportsByStatus()
    };
  }

  private getReportsByStatus() {
    const status = { pending: 0, verified: 0, rejected: 0 };
    
    for (const reports of Array.from(this.locationReports.values())) {
      for (const report of reports) {
        status[report.status as keyof typeof status]++;
      }
    }
    
    return status;
  }
}

// Export singleton instance
export const coordinateAccuracyVerifier = new CoordinateAccuracyVerifier();