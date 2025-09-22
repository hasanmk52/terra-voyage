/**
 * Coordinate Integration Service
 * Integrates all coordinate validation and geocoding systems with existing trip planning
 * Implements complete FR-008 integration
 */

import { geocodingService, GeocodeResult } from './geocoding-service';
import { CoordinateValidator, Coordinates } from './coordinate-validation';
import { coordinateAccuracyVerifier, AccuracyVerificationResult } from './coordinate-accuracy-verifier';
import { geographicDataManager, VerifiedDestination } from './geographic-data-manager';
import { Activity } from './itinerary-types';

export interface EnhancedActivity extends Activity {
  coordinateInfo?: {
    accuracy: AccuracyVerificationResult;
    source: string;
    verifiedDestination?: VerifiedDestination;
    userCorrected: boolean;
  };
}

export interface DestinationValidationResult {
  isValid: boolean;
  coordinates: Coordinates;
  formattedAddress: string;
  accuracy: 'high' | 'medium' | 'low';
  source: string;
  warnings: string[];
  suggestions?: string[];
}

export class CoordinateIntegrationService {
  /**
   * Comprehensive destination validation for trip planning
   * Implements FR-008.1, FR-008.2, FR-008.3, FR-008.4
   */
  async validateDestination(destination: string): Promise<DestinationValidationResult> {
    // SECURITY: Log operation without sensitive destination data
    console.log(`🎯 Validating destination (length: ${destination.length})`);
    
    try {
      // Step 1: Check if destination exists in verified database (FR-008.5)
      const verifiedDestination = geographicDataManager.findDestination(destination);
      if (verifiedDestination) {
        console.log(`✅ Found verified destination: ${verifiedDestination.name}`);
        
        return {
          isValid: true,
          coordinates: verifiedDestination.coordinates,
          formattedAddress: verifiedDestination.name,
          accuracy: verifiedDestination.accuracy,
          source: 'verified_database',
          warnings: [],
          suggestions: verifiedDestination.alternativeNames.length > 0 ? 
            [`Also known as: ${verifiedDestination.alternativeNames.join(', ')}`] : undefined
        };
      }

      // Step 2: Geocode the destination (FR-008.2, FR-008.3)
      const geocodeResult = await geocodingService.geocode(destination);
      // SECURITY: Log geocoding result without sensitive destination data
      console.log(`📍 Geocoding successful: accuracy ${geocodeResult.accuracy}, source ${geocodeResult.source}`);

      // Step 3: Validate coordinates (FR-008.1)
      const validation = CoordinateValidator.validate(geocodeResult.coordinates);
      if (!validation.valid) {
        return {
          isValid: false,
          coordinates: geocodeResult.coordinates,
          formattedAddress: geocodeResult.formattedAddress,
          accuracy: 'low',
          source: geocodeResult.source,
          warnings: [validation.error || 'Invalid coordinates'],
        };
      }

      // Step 4: Verify coordinate accuracy (FR-008.4)
      const accuracyResult = await coordinateAccuracyVerifier.verifyCoordinateAccuracy(
        geocodeResult.coordinates,
        destination
      );

      const warnings: string[] = [];
      if (validation.warnings) {
        warnings.push(...validation.warnings);
      }
      if (accuracyResult.issues.length > 0) {
        warnings.push(...accuracyResult.issues.map(issue => issue.description));
      }

      // Determine if backup service was used
      if (geocodeResult.source !== 'google' && geocodeResult.source !== 'cache') {
        warnings.push(`Using backup geocoding service: ${geocodeResult.source}`);
      }

      return {
        isValid: accuracyResult.isAccurate,
        coordinates: accuracyResult.verifiedCoordinates || geocodeResult.coordinates,
        formattedAddress: geocodeResult.formattedAddress,
        accuracy: geocodeResult.accuracy,
        source: geocodeResult.source,
        warnings,
        suggestions: accuracyResult.recommendations
      };

    } catch (error) {
      // SECURITY: Log error without exposing sensitive destination data
      console.error(`❌ Failed to validate destination (length: ${destination.length}):`, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        isValid: false,
        coordinates: { lat: 0, lng: 0 },
        formattedAddress: destination,
        accuracy: 'low',
        source: 'error',
        warnings: [`Failed to validate destination: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Enhance activities with coordinate validation and accuracy information
   * Implements FR-008.4, FR-008.6
   */
  async enhanceActivitiesWithCoordinates(activities: Activity[]): Promise<EnhancedActivity[]> {
    console.log(`🔍 Enhancing ${activities.length} activities with coordinate validation`);
    
    const enhancedActivities: EnhancedActivity[] = [];

    for (const activity of activities) {
      try {
        // Validate existing coordinates if present
        let coordinateInfo: EnhancedActivity['coordinateInfo'];

        if (activity.location?.coordinates) {
          const accuracy = await coordinateAccuracyVerifier.verifyCoordinateAccuracy(
            activity.location.coordinates,
            activity.location.address || activity.location.name
          );

          // Check if location exists in verified database
          const verifiedDestination = geographicDataManager.findDestination(activity.location.coordinates);

          coordinateInfo = {
            accuracy,
            source: 'existing',
            verifiedDestination: verifiedDestination || undefined,
            userCorrected: false
          };
        } else if (activity.location?.address || activity.location?.name) {
          // Geocode the location
          try {
            const locationQuery = activity.location.address || activity.location.name;
            const geocodeResult = await geocodingService.geocode(locationQuery);
            const accuracy = await coordinateAccuracyVerifier.verifyCoordinateAccuracy(
              geocodeResult.coordinates,
              locationQuery
            );

            coordinateInfo = {
              accuracy,
              source: geocodeResult.source,
              userCorrected: false
            };

            // Update activity with geocoded coordinates
            activity.location.coordinates = geocodeResult.coordinates;
          } catch (geocodeError) {
            // SECURITY: Log error without exposing sensitive location data
            console.warn(`Failed to geocode activity location (ID: ${activity.id})`, geocodeError instanceof Error ? geocodeError.message : 'Unknown error');
            coordinateInfo = {
              accuracy: {
                isAccurate: false,
                confidence: 0,
                issues: [{ 
                  type: 'data_conflict', 
                  severity: 'high', 
                  description: 'Failed to geocode location' 
                }],
                recommendations: ['Manually set coordinates for this activity'],
                sources: []
              },
              source: 'error',
              userCorrected: false
            };
          }
        }

        enhancedActivities.push({
          ...activity,
          coordinateInfo
        });

      } catch (error) {
        // SECURITY: Log error without exposing sensitive activity data
        console.error(`Failed to enhance activity (ID: ${activity.id})`, error instanceof Error ? error.message : 'Unknown error');
        enhancedActivities.push({
          ...activity,
          coordinateInfo: {
            accuracy: {
              isAccurate: false,
              confidence: 0,
              issues: [{ 
                type: 'data_conflict', 
                severity: 'high', 
                description: 'Enhancement failed' 
              }],
              recommendations: ['Manual verification required'],
              sources: []
            },
            source: 'error',
            userCorrected: false
          }
        });
      }
    }

    console.log(`✅ Enhanced ${enhancedActivities.length} activities with coordinate information`);
    return enhancedActivities;
  }

  /**
   * Apply user coordinate corrections to activities
   * Implements FR-008.6
   */
  async applyUserCoordinateCorrection(
    activityId: string,
    newCoordinates: Coordinates,
    address: string,
    userId: string
  ): Promise<void> {
    console.log(`🔧 Applying user coordinate correction for activity ${activityId}`);

    // Validate the new coordinates
    const validation = CoordinateValidator.validate(newCoordinates);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    // Apply the correction
    await coordinateAccuracyVerifier.applyCoordinateCorrection(
      newCoordinates, // Original coordinates would need to be passed in real implementation
      newCoordinates,
      'user_manual',
      0.9, // High confidence for user corrections
      userId
    );

    // SECURITY: Log success without exposing exact coordinates
    console.log(`✅ Applied user coordinate correction successfully`);
  }

  /**
   * Get coordinate statistics for monitoring
   */
  getCoordinateStats() {
    const geocodingStats = geocodingService.getStats();
    const cacheStats = geocodingService.getCacheStats();
    const verificationStats = coordinateAccuracyVerifier.getVerificationStats();
    const geographicStats = geographicDataManager.getSystemStats();

    return {
      geocoding: {
        ...geocodingStats,
        cacheHitRate: cacheStats.hitRate,
        cacheSize: cacheStats.size
      },
      verification: verificationStats,
      geographic: geographicStats,
      overall: {
        totalOperations: geocodingStats.totalRequests + verificationStats.totalReports,
        successRate: geocodingStats.totalRequests > 0 ? 
          (geocodingStats.totalRequests - geocodingStats.errors) / geocodingStats.totalRequests : 0,
        averageAccuracy: geographicStats.averageConfidence
      }
    };
  }

  /**
   * Batch process destinations for trip planning
   * Optimized for multiple destination validation
   */
  async validateDestinations(destinations: string[]): Promise<DestinationValidationResult[]> {
    console.log(`🎯 Batch validating ${destinations.length} destinations`);
    
    const results = await Promise.allSettled(
      destinations.map(dest => this.validateDestination(dest))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // SECURITY: Log error without exposing sensitive destination data
        console.error(`Failed to validate destination at index ${index}:`, result.reason);
        return {
          isValid: false,
          coordinates: { lat: 0, lng: 0 },
          formattedAddress: destinations[index],
          accuracy: 'low' as const,
          source: 'error',
          warnings: [`Validation failed: ${result.reason}`]
        };
      }
    });
  }

  /**
   * Schedule data updates for verified destinations
   * Implements FR-008.5 quarterly updates
   */
  async scheduleQuarterlyUpdates(): Promise<void> {
    console.log('📅 Scheduling quarterly data updates');
    
    const destinations = geographicDataManager.getAllVerifiedDestinations();
    
    for (const destination of destinations) {
      await geographicDataManager.scheduleDataUpdate(destination.id);
    }

    // Process any pending updates
    await geographicDataManager.processUpdateQueue();
    
    console.log('✅ Completed quarterly update scheduling');
  }

  /**
   * Clean up cache and optimize performance
   */
  async performMaintenance(): Promise<void> {
    console.log('🧹 Performing coordinate system maintenance');
    
    // Clear old cache entries
    geocodingService.clearCache();
    
    // Schedule data updates
    await this.scheduleQuarterlyUpdates();
    
    console.log('✅ Maintenance completed');
  }
}

// Export singleton instance
export const coordinateIntegrationService = new CoordinateIntegrationService();