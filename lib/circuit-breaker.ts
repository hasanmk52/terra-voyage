/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external APIs fail
 */

interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  resetTimeout: number;        // Time to wait before trying to close circuit (ms)
  timeout: number;            // Request timeout (ms)
  monitoringPeriod: number;   // Time window for monitoring failures (ms)
}

interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttempt: number;
}

interface CircuitBreakerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  lastFailure?: string;
}

type CircuitBreakerFunction<T> = () => Promise<T>;

class CircuitBreaker<T> {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private stats: CircuitBreakerStats;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      timeout: 10000,      // 10 seconds
      monitoringPeriod: 120000, // 2 minutes
      ...config,
    };

    this.state = {
      status: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
    };
  }

  async execute<R>(
    operation: CircuitBreakerFunction<R>,
    fallback?: () => Promise<R>
  ): Promise<R> {
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state.status === 'OPEN') {
      if (Date.now() < this.state.nextAttempt) {
        console.warn(`🔴 Circuit breaker [${this.name}] is OPEN, using fallback`);
        if (fallback) {
          return await fallback();
        }
        throw new CircuitBreakerOpenError(
          `Circuit breaker [${this.name}] is OPEN. Next attempt at ${new Date(this.state.nextAttempt).toISOString()}`
        );
      } else {
        // Transition to half-open
        this.state.status = 'HALF_OPEN';
        console.log(`🟡 Circuit breaker [${this.name}] transitioning to HALF_OPEN`);
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);
      
      // Success - reset failure count and close circuit
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - increment failure count and potentially open circuit
      this.onFailure(error);
      
      if (fallback) {
        console.warn(`🔴 Circuit breaker [${this.name}] failed, using fallback`);
        return await fallback();
      }
      
      throw error;
    }
  }

  private async executeWithTimeout<R>(operation: CircuitBreakerFunction<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CircuitBreakerTimeoutError(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.stats.successfulRequests++;
    
    if (this.state.status === 'HALF_OPEN') {
      console.log(`✅ Circuit breaker [${this.name}] closing after successful request`);
      this.state.status = 'CLOSED';
    }
    
    this.state.failureCount = 0;
  }

  private onFailure(error: any): void {
    this.stats.failedRequests++;
    this.stats.lastFailure = error.message || 'Unknown error';
    
    const now = Date.now();
    this.state.lastFailureTime = now;

    // Clean up old failures outside monitoring period
    if (now - this.state.lastFailureTime > this.config.monitoringPeriod) {
      this.state.failureCount = 0;
    }

    this.state.failureCount++;

    // Open circuit if threshold reached
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.status = 'OPEN';
      this.state.nextAttempt = now + this.config.resetTimeout;
      this.stats.circuitOpenCount++;
      
      console.error(`🔴 Circuit breaker [${this.name}] OPENED after ${this.state.failureCount} failures. Next attempt: ${new Date(this.state.nextAttempt).toISOString()}`);
    } else {
      console.warn(`⚠️ Circuit breaker [${this.name}] failure ${this.state.failureCount}/${this.config.failureThreshold}`);
    }
  }

  // Public methods for monitoring
  getState(): CircuitBreakerState & { name: string } {
    return { ...this.state, name: this.name };
  }

  getStats(): CircuitBreakerStats & { name: string } {
    return { ...this.stats, name: this.name };
  }

  isHealthy(): boolean {
    return this.state.status === 'CLOSED';
  }

  reset(): void {
    this.state = {
      status: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
    };
    console.log(`🔄 Circuit breaker [${this.name}] manually reset`);
  }
}

// Custom error classes
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerTimeoutError';
  }
}

// Circuit breaker instances for different services
export const circuitBreakers = {
  weather: new CircuitBreaker('Weather API', {
    failureThreshold: 3,
    resetTimeout: 30000,   // 30 seconds
    timeout: 8000,         // 8 seconds
  }),
  
  ai: new CircuitBreaker('AI Service', {
    failureThreshold: 3,
    resetTimeout: 60000,   // 1 minute
    timeout: 30000,        // 30 seconds
  }),
  
  maps: new CircuitBreaker('Maps API', {
    failureThreshold: 5,
    resetTimeout: 30000,   // 30 seconds
    timeout: 10000,        // 10 seconds
  }),
  
  mapbox: new CircuitBreaker('Mapbox API', {
    failureThreshold: 5,
    resetTimeout: 30000,   // 30 seconds
    timeout: 15000,        // 15 seconds
  }),
  
  database: new CircuitBreaker('Database', {
    failureThreshold: 3,
    resetTimeout: 60000,   // 1 minute
    timeout: 10000,        // 10 seconds
  }),
};

// Health check endpoint data
export function getCircuitBreakerStatus() {
  return Object.values(circuitBreakers).map(breaker => ({
    ...breaker.getState(),
    stats: breaker.getStats(),
  }));
}

export { CircuitBreaker };
export type { CircuitBreakerConfig, CircuitBreakerState, CircuitBreakerStats };