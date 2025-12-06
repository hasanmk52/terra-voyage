import { createHash } from 'crypto';

// Cache backend interface for consistent API
interface CacheBackend {
  set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
  get(key: string): Promise<any>;
  del(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  mget(keys: string[]): Promise<Array<any | null>>;
  mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean>;
  getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  getStats(): Promise<{
    size: number;
    activeKeys: number;
    expiredKeys: number;
    mode: string;
  }>;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; isConnected: boolean }>;
}

// In-memory cache implementation
class InMemoryCache implements CacheBackend {
  private cache: Map<string, { value: any; expiry: number }>;
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds

  constructor() {
    this.cache = new Map();
  }

  async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
    return true;
  }

  async get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async del(key: string) {
    return this.cache.delete(key);
  }

  async clear() {
    this.cache.clear();
    return true;
  }

  // Helper to clean expired items periodically
  startCleanup(intervalMs: number = 60000) {
    setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      for (const [key, item] of entries) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }

  // Utility functions
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached) return cached as T;

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; isConnected: boolean }> {
    return {
      status: 'healthy' as const,
      isConnected: true
    };
  }

  async mget(keys: string[]): Promise<Array<any | null>> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async mset(
    items: Array<{ key: string; value: any; ttl?: number }>
  ): Promise<boolean> {
    await Promise.all(
      items.map((item) => this.set(item.key, item.value, item.ttl))
    );
    return true;
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching (supports only * wildcard)
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.cache.keys()).filter((key) => regex.test(key));
  }

  // Get cache statistics
  async getStats(): Promise<{
    size: number;
    activeKeys: number;
    expiredKeys: number;
    mode: string;
  }> {
    const now = Date.now();
    let activeKeys = 0;
    let expiredKeys = 0;

    const entries = Array.from(this.cache.entries());
    for (const [_, item] of entries) {
      if (now > item.expiry) {
        expiredKeys++;
      } else {
        activeKeys++;
      }
    }

    return {
      size: this.cache.size,
      activeKeys,
      expiredKeys,
      mode: 'memory',
    };
  }
}

// Enhanced cache service with itinerary-specific methods
class EnhancedCache extends InMemoryCache {
  async getItinerary(key: string) {
    return this.get(`itinerary:${key}`)
  }

  async setItinerary(key: string, data: any) {
    return this.set(`itinerary:${key}`, data, 86400) // 24 hours
  }

  async warmCache(destinations: string[]) {
    // In-memory cache warming
    console.log('💾 Cache warming for destinations:', destinations)
  }

  getBackendType(): string {
    return 'memory';
  }

  isUsingRedis(): boolean {
    return false;
  }
}

// Generate secure cache key for itinerary requests
export function generateCacheKey(formData: any, userId?: string): string {
  try {
    const keyData = {
      destination: formData.destination?.destination,
      startDate: formData.dateRange?.startDate?.toISOString(),
      endDate: formData.dateRange?.endDate?.toISOString(),
      budget: formData.budget?.amount,
      interests: formData.interests?.sort(),
      travelers: formData.travelers?.adults,
      userId: userId, // Include user context for security
      salt: Math.floor(Date.now() / 86400000) // Daily salt to prevent long-term cache pollution
    }

    // Sort keys for consistent hashing
    const key = JSON.stringify(keyData, Object.keys(keyData).sort())

    // Use cryptographically secure hash
    const hash = createHash('sha256').update(key).digest('hex').substring(0, 16)
    return `trip_${hash}`
  } catch (error) {
    // Fallback for environments without crypto module
    const keyString = JSON.stringify({
      destination: formData.destination?.destination,
      startDate: formData.dateRange?.startDate?.toISOString(),
      endDate: formData.dateRange?.endDate?.toISOString(),
      budget: formData.budget?.amount,
      interests: formData.interests?.sort(),
      travelers: formData.travelers?.adults,
      userId: userId,
      timestamp: Math.floor(Date.now() / 86400000)
    })

    // Improved hash function (still not cryptographic but better than original)
    let hash = 0
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return `trip_${Math.abs(hash)}_${userId ? userId.substring(0, 8) : 'anon'}`
  }
}

// Export singleton instance
export const cacheService = new EnhancedCache();

// Start cleanup for automatic expiry management
cacheService.startCleanup();

console.log('💾 Cache: Using in-memory backend');
