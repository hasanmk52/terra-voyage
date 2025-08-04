/**
 * Example integration showing how to use the Redis client in Terra Voyage
 * This file demonstrates various usage patterns and can be used as a reference
 */

import { cacheService } from './cache-service';
import { createRedisClient, createEnhancedRedisClient, redisClient, enhancedRedisClient } from './redis-client';
import { generateCacheKey } from './cache-service';

// Example 1: Basic caching for trip data
export async function cacheTrip(tripId: string, tripData: any) {
  try {
    // Cache trip data for 24 hours
    await cacheService.set(`trip:${tripId}`, tripData, 86400);
    console.log('Trip cached successfully');
  } catch (error) {
    console.error('Failed to cache trip:', error);
  }
}

export async function getCachedTrip(tripId: string) {
  try {
    const tripData = await cacheService.get(`trip:${tripId}`);
    if (tripData) {
      console.log('Trip found in cache');
      return tripData;
    } else {
      console.log('Trip not in cache');
      return null;
    }
  } catch (error) {
    console.error('Failed to get cached trip:', error);
    return null;
  }
}

// Example 2: Itinerary caching with smart cache service
export async function cacheItinerary(formData: any) {
  try {
    // Generate consistent cache key
    const cacheKey = generateCacheKey(formData);
    
    // Check if itinerary already exists
    const existingItinerary = await cacheService.getItinerary(cacheKey);
    if (existingItinerary) {
      console.log('Found existing itinerary in cache');
      return existingItinerary;
    }

    // Generate new itinerary (mock)
    const newItinerary = {
      destination: formData.destination?.destination,
      duration: formData.duration,
      budget: formData.budget?.amount,
      activities: ['Sample Activity 1', 'Sample Activity 2'],
      generatedAt: new Date().toISOString(),
    };

    // Cache the new itinerary
    await cacheService.setItinerary(cacheKey, newItinerary);
    console.log('New itinerary cached');
    
    return newItinerary;
  } catch (error) {
    console.error('Failed to cache itinerary:', error);
    throw error;
  }
}

// Example 3: User session caching
export async function cacheUserSession(userId: string, sessionData: any) {
  try {
    // Cache user session for 2 hours
    const sessionKey = `session:${userId}`;
    await cacheService.set(sessionKey, sessionData, 7200);
    
    // Also cache user preferences separately with longer TTL
    if (sessionData.preferences) {
      await cacheService.set(
        `preferences:${userId}`,
        sessionData.preferences,
        86400 * 7 // 1 week
      );
    }
    
    console.log('User session cached');
  } catch (error) {
    console.error('Failed to cache user session:', error);
  }
}

// Example 4: Bulk operations for performance
export async function cacheManyDestinations(destinations: Array<{id: string, data: any}>) {
  try {
    // Prepare bulk operation
    const items = destinations.map(dest => ({
      key: `destination:${dest.id}`,
      value: dest.data,
      ttl: 86400 // 24 hours
    }));

    // Use bulk set for better performance
    const success = await cacheService.mset(items);
    
    if (success) {
      console.log(`Cached ${destinations.length} destinations`);
    } else {
      console.error('Bulk cache operation failed');
    }
  } catch (error) {
    console.error('Failed to bulk cache destinations:', error);
  }
}

export async function getManyDestinations(destinationIds: string[]) {
  try {
    // Prepare keys
    const keys = destinationIds.map(id => `destination:${id}`);
    
    // Use bulk get for better performance
    const results = await cacheService.mget(keys);
    
    // Filter out null results and create map
    const destinationMap = new Map();
    results.forEach((result, index) => {
      if (result) {
        destinationMap.set(destinationIds[index], result);
      }
    });
    
    console.log(`Retrieved ${destinationMap.size} destinations from cache`);
    return destinationMap;
  } catch (error) {
    console.error('Failed to get cached destinations:', error);
    return new Map();
  }
}

// Example 5: Cache-aside pattern with database fallback
export async function getDestinationWithFallback(destinationId: string) {
  return await cacheService.getOrSet(
    `destination:${destinationId}`,
    async () => {
      // This function only runs on cache miss
      console.log('Cache miss, fetching from database...');
      
      // Simulate database fetch
      const destinationData = await fetchDestinationFromDatabase(destinationId);
      
      return destinationData;
    },
    3600 // Cache for 1 hour
  );
}

// Example 6: Health monitoring and fallback detection
export async function monitorCacheHealth() {
  try {
    // Check cache health
    const health = await cacheService.healthCheck();
    console.log('Cache health:', health.status);
    console.log('Connected:', health.isConnected);
    
    // Get cache statistics
    const stats = await cacheService.getStats();
    console.log('Cache mode:', stats.mode);
    console.log('Total keys:', stats.size);
    console.log('Active keys:', stats.activeKeys);
    
    // Check backend type (if using SmartCache)
    if ('getBackendType' in cacheService) {
      console.log('Backend:', (cacheService as any).getBackendType());
      console.log('Using Redis:', (cacheService as any).isUsingRedis());
    }
    
    return {
      healthy: health.status === 'healthy',
      backend: stats.mode,
      keyCount: stats.activeKeys
    };
  } catch (error) {
    console.error('Failed to monitor cache health:', error);
    return { healthy: false, backend: 'unknown', keyCount: 0 };
  }
}

// Example 7: Cache warming for popular destinations
export async function warmPopularDestinations() {
  try {
    const popularDestinations = [
      'Paris', 'London', 'Tokyo', 'New York', 'Barcelona',
      'Rome', 'Amsterdam', 'Prague', 'Vienna', 'Budapest'
    ];
    
    console.log('Warming cache for popular destinations...');
    await cacheService.warmCache(popularDestinations);
    
    // Pre-cache some common data
    const warmupData = popularDestinations.map(destination => ({
      key: `popular:${destination.toLowerCase()}`,
      value: {
        name: destination,
        popular: true,
        warmedAt: Date.now(),
        basicInfo: `Popular destination: ${destination}`
      },
      ttl: 3600 // 1 hour
    }));
    
    await cacheService.mset(warmupData);
    console.log(`Cache warmed for ${popularDestinations.length} destinations`);
  } catch (error) {
    console.error('Failed to warm cache:', error);
  }
}

// Example 8: Direct Redis operations (advanced usage)
export async function advancedRedisOperations() {
  try {
    console.log('Performing advanced Redis operations...');
    
    // Create Redis client if needed
    const client = redisClient || createRedisClient();
    
    // Check Redis connection directly
    const health = await client.healthCheck();
    console.log('Direct Redis health:', health);
    
    // Use Redis-specific features
    if (health.isConnected) {
      // Set with custom TTL
      await client.set('advanced:test', { type: 'advanced' }, 60);
      
      // Check TTL
      const ttl = await client.ttl('advanced:test');
      console.log('TTL for advanced:test:', ttl);
      
      // Pattern search
      const keys = await client.keys('advanced:*');
      console.log('Advanced keys:', keys);
      
      // Clean up
      await client.del(keys);
    }
  } catch (error) {
    console.error('Advanced Redis operations failed:', error);
  }
}

// Example 9: Error handling and fallback behavior
export async function robustCacheOperation(key: string, data: any) {
  try {
    // Create enhanced Redis client if needed
    const client = enhancedRedisClient || createEnhancedRedisClient();
    
    // Primary operation with enhanced cache (includes fallback)
    const success = await client.set(key, data, 3600);
    
    if (success) {
      console.log('Data cached successfully');
      return true;
    } else {
      console.warn('Cache operation returned false - check connection');
      return false;
    }
  } catch (error) {
    console.error('Cache operation failed:', error);
    
    // Check if fallback is active
    const client = enhancedRedisClient || createEnhancedRedisClient();
    const health = await client.healthCheck();
    if ('fallbackActive' in health && health.fallbackActive) {
      console.log('Operating with in-memory fallback');
    }
    
    return false;
  }
}

// Mock database function for examples
async function fetchDestinationFromDatabase(destinationId: string) {
  // Simulate database delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    id: destinationId,
    name: `Destination ${destinationId}`,
    description: `Beautiful destination with ID ${destinationId}`,
    fetchedAt: new Date().toISOString(),
    fromDatabase: true
  };
}

// Example usage patterns for different scenarios
export const cachePatterns = {
  // Short-term data (user sessions, temporary calculations)
  shortTerm: (key: string, data: any) => cacheService.set(key, data, 300), // 5 minutes
  
  // Medium-term data (search results, processed data)
  mediumTerm: (key: string, data: any) => cacheService.set(key, data, 3600), // 1 hour
  
  // Long-term data (user preferences, static content)
  longTerm: (key: string, data: any) => cacheService.set(key, data, 86400), // 24 hours
  
  // Very long-term data (configuration, rarely changing data)
  veryLongTerm: (key: string, data: any) => cacheService.set(key, data, 604800), // 1 week
};

// Export health check function for monitoring
export { monitorCacheHealth as healthCheck };