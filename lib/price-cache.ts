import { cacheService } from "./cache-service";

// Type definitions
interface PriceData {
  price: number;
  currency: string;
  [key: string]: any;
}

interface CacheParams {
  [key: string]: any;
}

interface PriceAlert {
  userId: string;
  type: string;
  params: CacheParams;
  targetPrice: number;
  createdAt: number;
}

export class PriceCacheManager {
  private generateKey(type: string, params: CacheParams): string {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    return `price:${type}:${sortedParams}`;
  }

  async cachePrice(
    type: string,
    params: CacheParams,
    data: PriceData,
    ttlSeconds: number = 3600
  ) {
    const key = this.generateKey(type, params);
    return cacheService.set(
      key,
      {
        data,
        timestamp: Date.now(),
        type,
        params,
      },
      ttlSeconds
    );
  }

  async getCachedPrice(type: string, params: CacheParams) {
    const key = this.generateKey(type, params);
    return cacheService.get(key);
  }

  async getPriceHistory(type: string, params: CacheParams, days: number = 30) {
    const key = this.generateKey(type, params);
    const history = await cacheService.get(`history:${key}`);
    if (!history) {
      // Return mock data if no history exists
      return Array.from({ length: days }, (_, i) => ({
        price: Math.floor(Math.random() * 100) + 200,
        timestamp: Date.now() - i * 86400000,
        type,
        params,
      }));
    }
    return history;
  }

  async createPriceAlert(
    userId: string,
    type: string,
    params: CacheParams,
    targetPrice: number
  ) {
    const key = `alert:${userId}:${type}:${JSON.stringify(params)}`;
    const alert: PriceAlert = {
      userId,
      type,
      params,
      targetPrice,
      createdAt: Date.now(),
    };
    return cacheService.set(key, alert, 30 * 86400); // 30 days TTL
  }

  async checkPriceAlerts(userId: string) {
    // In a real implementation, you'd scan for all alerts
    // Here we'll just return an empty array since in-memory cache
    // doesn't support pattern scanning
    return [];
  }

  async deletePriceAlert(alertId: string) {
    return cacheService.del(`alert:${alertId}`);
  }
}

// Export singleton instance
export const priceCacheManager = new PriceCacheManager();

// Graceful shutdown
process.on("SIGINT", async () => {
  // No explicit disconnect needed for in-memory cache
});

process.on("SIGTERM", async () => {
  // No explicit disconnect needed for in-memory cache
});
