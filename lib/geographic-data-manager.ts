/**
 * Geographic Data Management System
 * Implements FR-008.5: Geographic data management with verified coordinates
 */

import { Coordinates, CoordinateValidator } from './coordinate-validation';
import { coordinateAccuracyVerifier, CoordinateCorrection } from './coordinate-accuracy-verifier';

export interface VerifiedDestination {
  id: string;
  name: string;
  coordinates: Coordinates;
  accuracy: 'high' | 'medium' | 'low';
  verificationDate: Date;
  verifiedBy: string;
  sources: string[];
  alternativeNames: string[];
  metadata: {
    country: string;
    adminArea?: string;
    locality?: string;
    type: 'city' | 'landmark' | 'region' | 'poi';
    popularity: number; // 1-10 scale
  };
  confidence: number; // 0-1 scale
  lastUpdated: Date;
  updateFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export interface DataSource {
  name: string;
  type: 'api' | 'manual' | 'crowdsourced' | 'official';
  reliability: number; // 0-1 scale
  lastUsed: Date;
  successRate: number;
  averageAccuracy: 'high' | 'medium' | 'low';
}

export interface ConflictResolution {
  conflictId: string;
  destination: string;
  coordinates: Coordinates[];
  sources: string[];
  resolution: 'manual_review' | 'highest_reliability' | 'most_recent' | 'consensus';
  resolvedCoordinates?: Coordinates;
  resolvedBy?: string;
  resolvedAt?: Date;
  confidence: number;
}

// Source hierarchy for conflict resolution (highest to lowest priority)
const SOURCE_HIERARCHY: Record<string, number> = {
  'government_survey': 10,
  'official_tourism': 9,
  'verified_manual': 8,
  'google_verified': 7,
  'google': 6,
  'nominatim': 5,
  'crowdsourced_verified': 4,
  'crowdsourced': 3,
  'fallback': 2,
  'unknown': 1
};

export class GeographicDataManager {
  private verifiedDestinations: Map<string, VerifiedDestination> = new Map();
  private dataSources: Map<string, DataSource> = new Map();
  private conflictResolutions: Map<string, ConflictResolution> = new Map();
  private updateQueue: Set<string> = new Set();

  constructor() {
    this.initializeDataSources();
    this.loadInitialDestinations();
  }

  /**
   * FR-008.5: Maintain database of verified coordinates for popular destinations
   */
  async addVerifiedDestination(destination: Omit<VerifiedDestination, 'id' | 'lastUpdated'>): Promise<string> {
    // Validate coordinates
    const validation = CoordinateValidator.validate(destination.coordinates);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    // Generate unique ID
    const id = this.generateDestinationId(destination.name, destination.coordinates);

    // Check for existing destination at similar coordinates
    const existing = this.findNearbyDestination(destination.coordinates, 0.1); // 100m tolerance
    if (existing && existing.id !== id) {
      throw new Error(`Destination already exists nearby: ${existing.name} (${existing.id})`);
    }

    const verifiedDestination: VerifiedDestination = {
      ...destination,
      id,
      lastUpdated: new Date()
    };

    this.verifiedDestinations.set(id, verifiedDestination);
    console.log(`✅ Added verified destination: ${destination.name} (${id})`);
    
    return id;
  }

  /**
   * FR-008.5: Manual coordinate corrections preservation
   */
  async updateDestinationCoordinates(
    destinationId: string,
    newCoordinates: Coordinates,
    source: string,
    verifiedBy: string
  ): Promise<void> {
    const destination = this.verifiedDestinations.get(destinationId);
    if (!destination) {
      throw new Error(`Destination not found: ${destinationId}`);
    }

    // Validate new coordinates
    const validation = CoordinateValidator.validate(newCoordinates);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    // Store the correction for tracking
    await coordinateAccuracyVerifier.applyCoordinateCorrection(
      destination.coordinates,
      newCoordinates,
      source,
      0.9, // High confidence for manual corrections
      verifiedBy
    );

    // Update destination
    destination.coordinates = newCoordinates;
    destination.verifiedBy = verifiedBy;
    destination.verificationDate = new Date();
    destination.lastUpdated = new Date();
    destination.sources = [source, ...destination.sources.filter(s => s !== source)];
    destination.confidence = Math.min(1.0, destination.confidence + 0.1); // Boost confidence

    this.verifiedDestinations.set(destinationId, destination);
    console.log(`🔄 Updated coordinates for ${destination.name}: ${CoordinateValidator.normalize(newCoordinates)}`);
  }

  /**
   * FR-008.6: Coordinate conflicts resolution using source hierarchy
   */
  async resolveCoordinateConflict(
    destinationName: string,
    coordinateOptions: { coordinates: Coordinates; source: string; confidence: number }[]
  ): Promise<ConflictResolution> {
    const conflictId = this.generateConflictId(destinationName, coordinateOptions);
    
    // Check if already resolved
    const existing = this.conflictResolutions.get(conflictId);
    if (existing) {
      return existing;
    }

    // Apply resolution strategy
    const resolution = this.applyResolutionStrategy(coordinateOptions);
    
    const conflictResolution: ConflictResolution = {
      conflictId,
      destination: destinationName,
      coordinates: coordinateOptions.map(opt => opt.coordinates),
      sources: coordinateOptions.map(opt => opt.source),
      resolution: resolution.strategy,
      resolvedCoordinates: resolution.coordinates,
      resolvedBy: 'system',
      resolvedAt: new Date(),
      confidence: resolution.confidence
    };

    this.conflictResolutions.set(conflictId, conflictResolution);
    
    console.log(`⚖️ Resolved coordinate conflict for ${destinationName} using ${resolution.strategy}`);
    return conflictResolution;
  }

  /**
   * Apply conflict resolution strategy based on source hierarchy
   */
  private applyResolutionStrategy(
    options: { coordinates: Coordinates; source: string; confidence: number }[]
  ): { strategy: ConflictResolution['resolution']; coordinates: Coordinates; confidence: number } {
    // Strategy 1: Use highest reliability source
    const sortedBySources = options.sort((a, b) => 
      (SOURCE_HIERARCHY[b.source] || 0) - (SOURCE_HIERARCHY[a.source] || 0)
    );

    if (sortedBySources[0] && (SOURCE_HIERARCHY[sortedBySources[0].source] || 0) >= 7) {
      return {
        strategy: 'highest_reliability',
        coordinates: sortedBySources[0].coordinates,
        confidence: sortedBySources[0].confidence
      };
    }

    // Strategy 2: Use consensus if coordinates are close
    const consensus = this.findConsensusCoordinates(options);
    if (consensus) {
      return {
        strategy: 'consensus',
        coordinates: consensus.coordinates,
        confidence: consensus.confidence
      };
    }

    // Strategy 3: Use most recent/highest confidence
    const sortedByConfidence = options.sort((a, b) => b.confidence - a.confidence);
    
    return {
      strategy: 'manual_review',
      coordinates: sortedByConfidence[0].coordinates,
      confidence: sortedByConfidence[0].confidence * 0.8 // Reduce confidence due to conflict
    };
  }

  /**
   * Find consensus coordinates when multiple sources agree
   */
  private findConsensusCoordinates(
    options: { coordinates: Coordinates; source: string; confidence: number }[]
  ): { coordinates: Coordinates; confidence: number } | null {
    if (options.length < 2) return null;

    // Group coordinates that are close to each other (within 100m)
    const groups: { coordinates: Coordinates; source: string; confidence: number }[][] = [];
    
    for (const option of options) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const avgCoords = this.calculateAverageCoordinates(group.map(g => g.coordinates));
        const distance = CoordinateValidator.calculateDistance(option.coordinates, avgCoords);
        
        if (distance <= 0.1) { // Within 100m
          group.push(option);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([option]);
      }
    }

    // Find largest group (consensus)
    const largestGroup = groups.reduce((prev, current) => 
      current.length > prev.length ? current : prev
    );

    // Need at least 2 sources to agree
    if (largestGroup.length < 2) return null;

    const avgCoordinates = this.calculateAverageCoordinates(largestGroup.map(g => g.coordinates));
    const avgConfidence = largestGroup.reduce((sum, g) => sum + g.confidence, 0) / largestGroup.length;

    return {
      coordinates: avgCoordinates,
      confidence: Math.min(1.0, avgConfidence * 1.1) // Boost confidence for consensus
    };
  }

  /**
   * Calculate average coordinates from multiple points
   */
  private calculateAverageCoordinates(coordinates: Coordinates[]): Coordinates {
    if (coordinates.length === 0) {
      throw new Error('No coordinates provided');
    }

    const avgLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
    const avgLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;

    return CoordinateValidator.normalize({ lat: avgLat, lng: avgLng });
  }

  /**
   * Find destination by name or coordinates
   */
  findDestination(query: string | Coordinates): VerifiedDestination | null {
    if (typeof query === 'string') {
      // Search by name or alternative names
      const queryLower = query.toLowerCase();
      
      for (const destination of Array.from(this.verifiedDestinations.values())) {
        if (destination.name.toLowerCase() === queryLower ||
            destination.alternativeNames.some((alt: string) => alt.toLowerCase() === queryLower)) {
          return destination;
        }
      }
      
      // Fuzzy search
      for (const destination of Array.from(this.verifiedDestinations.values())) {
        if (destination.name.toLowerCase().includes(queryLower) ||
            destination.alternativeNames.some((alt: string) => alt.toLowerCase().includes(queryLower))) {
          return destination;
        }
      }
    } else {
      // Search by coordinates
      return this.findNearbyDestination(query, 0.01); // 10m tolerance
    }

    return null;
  }

  /**
   * Find destination near given coordinates
   */
  findNearbyDestination(coordinates: Coordinates, radiusKm: number = 1.0): VerifiedDestination | null {
    let closest: VerifiedDestination | null = null;
    let closestDistance = Infinity;

    for (const destination of Array.from(this.verifiedDestinations.values())) {
      const distance = CoordinateValidator.calculateDistance(coordinates, destination.coordinates);
      
      if (distance <= radiusKm && distance < closestDistance) {
        closest = destination;
        closestDistance = distance;
      }
    }

    return closest;
  }

  /**
   * FR-008.6: Geographic data quarterly updates
   */
  async scheduleDataUpdate(destinationId: string): Promise<void> {
    const destination = this.verifiedDestinations.get(destinationId);
    if (!destination) {
      throw new Error(`Destination not found: ${destinationId}`);
    }

    // Check if update is needed based on frequency
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - destination.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    
    const updateIntervals = {
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annually: 365
    };

    if (daysSinceUpdate >= updateIntervals[destination.updateFrequency]) {
      this.updateQueue.add(destinationId);
      console.log(`📅 Scheduled update for ${destination.name}`);
    }
  }

  /**
   * Process scheduled updates
   */
  async processUpdateQueue(): Promise<void> {
    const updates = Array.from(this.updateQueue);
    this.updateQueue.clear();

    for (const destinationId of updates) {
      try {
        await this.updateDestinationData(destinationId);
      } catch (error) {
        console.error(`Failed to update ${destinationId}:`, error);
      }
    }
  }

  /**
   * Update destination data from external sources
   */
  private async updateDestinationData(destinationId: string): Promise<void> {
    const destination = this.verifiedDestinations.get(destinationId);
    if (!destination) return;

    try {
      // Verify current coordinates are still accurate
      const verification = await coordinateAccuracyVerifier.verifyCoordinateAccuracy(
        destination.coordinates,
        destination.name
      );

      if (!verification.isAccurate && verification.verifiedCoordinates) {
        // Update with verified coordinates
        destination.coordinates = verification.verifiedCoordinates;
        destination.confidence = verification.confidence;
        destination.lastUpdated = new Date();
        
        this.verifiedDestinations.set(destinationId, destination);
        console.log(`🔄 Updated ${destination.name} with verified coordinates`);
      } else {
        // Just update the timestamp
        destination.lastUpdated = new Date();
        this.verifiedDestinations.set(destinationId, destination);
      }

    } catch (error) {
      console.error(`Failed to update ${destination.name}:`, error);
    }
  }

  /**
   * Initialize known data sources
   */
  private initializeDataSources(): void {
    const sources: DataSource[] = [
      {
        name: 'google',
        type: 'api',
        reliability: 0.9,
        lastUsed: new Date(),
        successRate: 0.95,
        averageAccuracy: 'high'
      },
      {
        name: 'nominatim',
        type: 'api',
        reliability: 0.7,
        lastUsed: new Date(),
        successRate: 0.85,
        averageAccuracy: 'medium'
      },
      {
        name: 'manual',
        type: 'manual',
        reliability: 0.95,
        lastUsed: new Date(),
        successRate: 1.0,
        averageAccuracy: 'high'
      },
      {
        name: 'fallback',
        type: 'manual',
        reliability: 0.8,
        lastUsed: new Date(),
        successRate: 1.0,
        averageAccuracy: 'medium'
      }
    ];

    for (const source of sources) {
      this.dataSources.set(source.name, source);
    }
  }

  /**
   * Load initial verified destinations
   */
  private loadInitialDestinations(): void {
    const initialDestinations: Omit<VerifiedDestination, 'id' | 'lastUpdated'>[] = [
      {
        name: 'Eiffel Tower',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        accuracy: 'high',
        verificationDate: new Date('2024-01-01'),
        verifiedBy: 'system',
        sources: ['government_survey', 'google_verified'],
        alternativeNames: ['Tour Eiffel', 'Iron Lady'],
        metadata: {
          country: 'France',
          adminArea: 'Île-de-France',
          locality: 'Paris',
          type: 'landmark',
          popularity: 10
        },
        confidence: 1.0,
        updateFrequency: 'annually'
      },
      {
        name: 'Times Square',
        coordinates: { lat: 40.7580, lng: -73.9855 },
        accuracy: 'high',
        verificationDate: new Date('2024-01-01'),
        verifiedBy: 'system',
        sources: ['official_tourism', 'google_verified'],
        alternativeNames: ['The Crossroads of the World', 'The Great White Way'],
        metadata: {
          country: 'United States',
          adminArea: 'New York',
          locality: 'New York City',
          type: 'landmark',
          popularity: 10
        },
        confidence: 1.0,
        updateFrequency: 'annually'
      },
      {
        name: 'Sydney Opera House',
        coordinates: { lat: -33.8568, lng: 151.2153 },
        accuracy: 'high',
        verificationDate: new Date('2024-01-01'),
        verifiedBy: 'system',
        sources: ['government_survey', 'official_tourism'],
        alternativeNames: ['Opera House Sydney'],
        metadata: {
          country: 'Australia',
          adminArea: 'New South Wales',
          locality: 'Sydney',
          type: 'landmark',
          popularity: 9
        },
        confidence: 1.0,
        updateFrequency: 'annually'
      }
    ];

    for (const destination of initialDestinations) {
      try {
        this.addVerifiedDestination(destination);
      } catch (error) {
        console.warn(`Failed to load initial destination ${destination.name}:`, error);
      }
    }
  }

  // Utility methods
  private generateDestinationId(name: string, coordinates: Coordinates): string {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const coordHash = Math.abs(coordinates.lat * 1000000 + coordinates.lng * 1000000).toString(36);
    return `${normalizedName}-${coordHash}`;
  }

  private generateConflictId(destination: string, options: any[]): string {
    const hash = destination + options.length + Date.now();
    return Math.abs(hash.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(36);
  }

  // Public API methods
  getAllVerifiedDestinations(): VerifiedDestination[] {
    return Array.from(this.verifiedDestinations.values());
  }

  getDataSourceStats(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  getConflictResolutions(): ConflictResolution[] {
    return Array.from(this.conflictResolutions.values());
  }

  getUpdateQueue(): string[] {
    return Array.from(this.updateQueue);
  }

  getSystemStats() {
    return {
      totalDestinations: this.verifiedDestinations.size,
      pendingUpdates: this.updateQueue.size,
      resolvedConflicts: this.conflictResolutions.size,
      averageConfidence: this.calculateAverageConfidence(),
      dataSourceCount: this.dataSources.size
    };
  }

  private calculateAverageConfidence(): number {
    const destinations = Array.from(this.verifiedDestinations.values());
    if (destinations.length === 0) return 0;
    
    const totalConfidence = destinations.reduce((sum, dest) => sum + dest.confidence, 0);
    return totalConfidence / destinations.length;
  }
}

// Export singleton instance
export const geographicDataManager = new GeographicDataManager();