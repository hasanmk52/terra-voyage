
// Simple in-memory cache implementation
class InMemoryCache {
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
      for (const [key, item] of this.cache.entries()) {
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

    for (const [_, item] of this.cache.entries()) {
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
      mode: useMocks ? 'mock' : 'live',
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
    // Mock implementation for cache warming
    console.log('Cache warming for destinations:', destinations)
  }
  
  async healthCheck() {
    return {
      status: 'healthy' as const,
      isConnected: true
    }
  }
}

// Generate cache key for itinerary requests
export function generateCacheKey(formData: any): string {
  const key = JSON.stringify({
    destination: formData.destination?.destination,
    startDate: formData.dateRange?.startDate?.toISOString(),
    endDate: formData.dateRange?.endDate?.toISOString(),
    budget: formData.budget?.amount,
    interests: formData.interests?.sort(),
    travelers: formData.travelers?.adults
  })
  
  // Create a hash of the key for shorter cache keys
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return `trip_${Math.abs(hash)}`
}

// Export singleton instance
export const cacheService = new EnhancedCache();
// Start cleanup every minute
cacheService.startCleanup();
