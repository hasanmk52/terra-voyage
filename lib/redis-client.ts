import { createClient, RedisClientType } from 'redis';

// Types for Redis REST API (Upstash format)
interface UpstashResponse<T = any> {
  result: T;
}

interface UpstashErrorResponse {
  error: string;
}

interface CacheItem {
  value: any;
  expiry: number;
}

interface CacheStats {
  size: number;
  activeKeys: number;
  expiredKeys: number;
  mode: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  isConnected: boolean;
  latency?: number;
  error?: string;
}

/**
 * Redis client implementation using Upstash REST API
 * Compatible with the existing cache service interface
 */
export class RedisClient {
  private readonly restUrl: string;
  private readonly restToken: string;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private isConnected = false;
  private connectionError: string | null = null;

  constructor() {
    this.restUrl = process.env.REDIS_REST_URL || '';
    this.restToken = process.env.REDIS_REST_TOKEN || '';

    if (!this.restUrl || !this.restToken) {
      throw new Error('Redis REST URL and TOKEN must be provided via environment variables');
    }

    // Test connection on initialization
    this.testConnection();
  }

  /**
   * Test Redis connection and update connection status
   */
  private async testConnection(): Promise<void> {
    try {
      await this.ping();
      this.isConnected = true;
      this.connectionError = null;
    } catch (error) {
      this.isConnected = false;
      this.connectionError = error instanceof Error ? error.message : 'Unknown connection error';
      console.warn('Redis connection failed:', this.connectionError);
    }
  }

  /**
   * Make HTTP request to Upstash REST API
   */
  private async makeRequest<T = any>(
    command: string,
    ...args: (string | number)[]
  ): Promise<T> {
    const url = this.restUrl;
    
    // Upstash REST API expects the command and arguments as an array
    const requestBody = [command, ...args];

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.restToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Redis REST API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: UpstashResponse<T> | UpstashErrorResponse = await response.json();

      if ('error' in data) {
        throw new Error(`Redis command error: ${data.error}`);
      }

      return data.result;
    } catch (error) {
      // On network/API errors, mark as disconnected
      this.isConnected = false;
      this.connectionError = error instanceof Error ? error.message : 'Network error';
      throw error;
    }
  }

  /**
   * Set a key-value pair with optional TTL
   */
  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<boolean> {
    try {
      const serializedValue = this.safeJsonStringify(value);
      
      if (ttlSeconds > 0) {
        await this.makeRequest('SETEX', key, ttlSeconds, serializedValue);
      } else {
        await this.makeRequest('SET', key, serializedValue);
      }
      
      return true;
    } catch (error) {
      this.logError('SET', error);
      return false;
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<any> {
    try {
      const result = await this.makeRequest<string | null>('GET', key);
      
      if (result === null) {
        return null;
      }

      return this.safeJsonParse(result);
    } catch (error) {
      this.logError('GET', error);
      return null;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(key: string | string[]): Promise<boolean> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      const deletedCount = await this.makeRequest<number>('DEL', ...keys);
      return deletedCount > 0;
    } catch (error) {
      this.logError('DEL', error);
      return false;
    }
  }

  /**
   * Clear all keys (FLUSHDB)
   */
  async clear(): Promise<boolean> {
    try {
      await this.makeRequest('FLUSHDB');
      return true;
    } catch (error) {
      this.logError('FLUSHDB', error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.makeRequest<number>('EXISTS', key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys: string[]): Promise<Array<any | null>> {
    try {
      const results = await this.makeRequest<(string | null)[]>('MGET', ...keys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      console.error('Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      // Use pipeline for better performance
      const pipeline = items.map(async item => {
        const ttl = item.ttl || this.DEFAULT_TTL;
        return this.set(item.key, item.value, ttl);
      });

      const results = await Promise.all(pipeline);
      return results.every(result => result === true);
    } catch (error) {
      this.logError('MSET', error);
      return false;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      // Validate pattern for security - only allow safe characters
      if (!/^[a-zA-Z0-9:_*-]+$/.test(pattern)) {
        throw new Error('Invalid pattern: only alphanumeric, :, _, *, - characters allowed');
      }
      
      // Limit pattern complexity to prevent DoS
      if (pattern.length > 100) {
        throw new Error('Pattern too long: maximum 100 characters');
      }
      
      // Limit wildcard complexity
      const wildcardCount = (pattern.match(/\*/g) || []).length;
      if (wildcardCount > 3) {
        throw new Error('Pattern too complex: maximum 3 wildcards allowed');
      }
      
      const keys = await this.makeRequest<string[]>('KEYS', pattern);
      return keys || [];
    } catch (error) {
      this.logError('KEYS', error);
      return [];
    }
  }

  /**
   * Get or set pattern - fetch from function if not in cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached as T;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    const result = await this.makeRequest<string>('PING');
    this.isConnected = true;
    this.connectionError = null;
    return result;
  }

  /**
   * Get Redis server info
   */
  async info(): Promise<string> {
    try {
      return await this.makeRequest<string>('INFO');
    } catch (error) {
      this.logError('INFO', error);
      return '';
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.makeRequest<number>('EXPIRE', key, seconds);
      return result === 1;
    } catch (error) {
      this.logError('EXPIRE', error);
      return false;
    }
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.makeRequest<number>('TTL', key);
    } catch (error) {
      this.logError('TTL', error);
      return -1;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.info();
      const dbSize = await this.makeRequest<number>('DBSIZE');
      
      // Parse memory info from INFO command (simplified)
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        size: dbSize,
        activeKeys: dbSize,
        expiredKeys: 0, // Redis handles expiration automatically
        mode: 'redis',
      };
    } catch (error) {
      console.error('Redis STATS error:', error);
      return {
        size: 0,
        activeKeys: 0,
        expiredKeys: 0,
        mode: 'redis-error',
      };
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await this.ping();
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        isConnected: true,
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        isConnected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; error: string | null } {
    return {
      isConnected: this.isConnected,
      error: this.connectionError,
    };
  }

  /**
   * Enhanced cache methods compatible with existing cache service
   */

  /**
   * Get itinerary from cache with automatic key prefixing
   */
  async getItinerary(key: string): Promise<any> {
    return this.get(`itinerary:${key}`);
  }

  /**
   * Set itinerary in cache with automatic key prefixing and 24h TTL
   */
  async setItinerary(key: string, data: any): Promise<boolean> {
    return this.set(`itinerary:${key}`, data, 86400); // 24 hours
  }

  /**
   * Warm cache with destination data (mock implementation for now)
   */
  async warmCache(destinations: string[]): Promise<void> {
    console.log('Redis cache warming for destinations:', destinations);
    
    // In a real implementation, you might:
    // 1. Pre-fetch common data for these destinations
    // 2. Store frequently accessed patterns
    // 3. Cache weather, attractions, etc.
    
    try {
      const warmupPromises = destinations.map(async (destination) => {
        const cacheKey = `destination:${destination.toLowerCase()}`;
        const exists = await this.exists(cacheKey);
        
        if (!exists) {
          // Store basic destination info for faster access
          await this.set(cacheKey, {
            name: destination,
            warmedAt: Date.now(),
            type: 'destination-warmup'
          }, 3600); // 1 hour TTL for warmup data
        }
      });

      await Promise.all(warmupPromises);
      console.log(`Cache warmed for ${destinations.length} destinations`);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  /**
   * Security helper methods
   */
  private safeJsonParse(data: string): any {
    try {
      // Add size limit to prevent memory exhaustion
      if (data.length > 1024 * 1024) { // 1MB limit
        throw new Error('Data too large for parsing');
      }
      
      const parsed = JSON.parse(data);
      
      // Basic prototype pollution protection - only check for direct __proto__ manipulation
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed) === false) {
        if (parsed.hasOwnProperty('__proto__')) {
          throw new Error('Potentially malicious object detected');
        }
      }
      
      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  private safeJsonStringify(value: any): string {
    try {
      // Prevent circular references and limit depth
      const seen = new WeakSet();
      const result = JSON.stringify(value, (key, val) => {
        if (val != null && typeof val === 'object') {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      });
      
      // Size limit check
      if (result.length > 1024 * 1024) { // 1MB limit
        throw new Error('Object too large for caching');
      }
      
      return result;
    } catch (error) {
      throw new Error('Failed to serialize object for caching');
    }
  }

  private logError(operation: string, error: any): void {
    // Log detailed error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error(`Redis ${operation} error:`, error);
    } else {
      // Production: log sanitized error
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Redis ${operation} failed:`, message);
    }
  }

  /**
   * Graceful shutdown - cleanup connections
   */
  async disconnect(): Promise<void> {
    // For REST API client, no persistent connections to close
    // Just mark as disconnected
    this.isConnected = false;
    console.log('Redis REST client disconnected');
  }
}

/**
 * Enhanced Redis Cache with fallback behavior
 */
export class EnhancedRedisCache extends RedisClient {
  private fallbackToMemory = false;
  private memoryCache = new Map<string, { value: any; expiry: number }>();

  constructor() {
    super();
    
    // Check connection status and enable fallback if needed
    this.healthCheck().then(health => {
      if (!health.isConnected) {
        console.warn('Redis unavailable, enabling in-memory fallback');
        this.fallbackToMemory = true;
      }
    });
  }

  /**
   * Set with fallback to memory cache
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      const result = await super.set(key, value, ttlSeconds);
      if (result) return true;
    } catch (error) {
      console.warn('Redis SET failed, falling back to memory:', error);
    }

    // Fallback to memory cache
    this.fallbackToMemory = true;
    const expiry = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value, expiry });
    return true;
  }

  /**
   * Get with fallback to memory cache
   */
  async get(key: string): Promise<any> {
    try {
      if (!this.fallbackToMemory) {
        const result = await super.get(key);
        if (result !== null) return result;
      }
    } catch (error) {
      console.warn('Redis GET failed, falling back to memory:', error);
      this.fallbackToMemory = true;
    }

    // Check memory cache
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete with fallback
   */
  async del(key: string | string[]): Promise<boolean> {
    let redisResult = false;
    
    try {
      if (!this.fallbackToMemory) {
        redisResult = await super.del(key);
      }
    } catch (error) {
      console.warn('Redis DEL failed, falling back to memory:', error);
      this.fallbackToMemory = true;
    }

    // Also delete from memory cache
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach(k => this.memoryCache.delete(k));
    
    return redisResult || this.fallbackToMemory;
  }

  /**
   * Clear with fallback
   */
  async clear(): Promise<boolean> {
    let redisResult = false;
    
    try {
      if (!this.fallbackToMemory) {
        redisResult = await super.clear();
      }
    } catch (error) {
      console.warn('Redis CLEAR failed, falling back to memory:', error);
      this.fallbackToMemory = true;
    }

    // Also clear memory cache
    this.memoryCache.clear();
    return redisResult || this.fallbackToMemory;
  }

  /**
   * Enhanced health check including fallback status
   */
  async healthCheck(): Promise<HealthCheckResult & { fallbackActive: boolean }> {
    const baseHealth = await super.healthCheck();
    
    return {
      ...baseHealth,
      fallbackActive: this.fallbackToMemory,
    };
  }
}

// Export factory functions to avoid instantiation errors when Redis isn't configured
export function createRedisClient(): RedisClient {
  return new RedisClient();
}

export function createEnhancedRedisClient(): EnhancedRedisCache {
  return new EnhancedRedisCache();
}

// Export instances only if Redis is configured
let redisClient: RedisClient | null = null;
let enhancedRedisClient: EnhancedRedisCache | null = null;

try {
  if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN) {
    redisClient = new RedisClient();
    enhancedRedisClient = new EnhancedRedisCache();
  }
} catch (error) {
  console.warn('Redis client initialization failed:', error);
}

export { redisClient, enhancedRedisClient };

// Export for easy swapping with existing cache service
export const redisCacheService = enhancedRedisClient;

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down Redis client...');
  await redisClient.disconnect();
  await enhancedRedisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Gracefully shutting down Redis client...');
  await redisClient.disconnect();
  await enhancedRedisClient.disconnect();
  process.exit(0);
});