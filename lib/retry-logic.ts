/**
 * Retry Logic with Exponential Backoff
 * Implements smart retry mechanisms for failed API calls
 */

interface RetryConfig {
  maxAttempts: number;        // Maximum number of retry attempts
  baseDelay: number;          // Base delay in milliseconds
  maxDelay: number;           // Maximum delay cap
  backoffMultiplier: number;  // Multiplier for exponential backoff
  jitter: boolean;           // Add random jitter to prevent thundering herd
  retryCondition?: (error: any) => boolean; // Custom condition for when to retry
  onProgress?: (progress: RetryProgress) => void; // Progress callback for UI updates
  onRetry?: (attempt: number, delay: number, error: any) => void; // Retry attempt callback
}

interface RetryAttempt {
  attempt: number;
  delay: number;
  error?: any;
  timestamp: number;
}

interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: RetryAttempt[];
  totalTime: number;
}

interface RetryProgress {
  currentAttempt: number;
  maxAttempts: number;
  nextRetryDelay?: number;
  error?: string;
  isRetrying: boolean;
  estimatedCompletion?: number;
}

interface CancellationToken {
  isCancelled: boolean;
  cancel: () => void;
}

// Default retry configurations for different service types
export const retryConfigs = {
  network: {
    maxAttempts: 3,
    baseDelay: 1000,        // 1 second
    maxDelay: 10000,        // 10 seconds
    backoffMultiplier: 2,
    jitter: true,
  },
  
  rateLimit: {
    maxAttempts: 5,
    baseDelay: 2000,        // 2 seconds
    maxDelay: 30000,        // 30 seconds
    backoffMultiplier: 2.5,
    jitter: true,
  },
  
  serverError: {
    maxAttempts: 3,
    baseDelay: 2000,        // 2 seconds
    maxDelay: 15000,        // 15 seconds
    backoffMultiplier: 2,
    jitter: true,
  },
  
  timeout: {
    maxAttempts: 2,
    baseDelay: 500,         // 0.5 seconds
    maxDelay: 5000,         // 5 seconds
    backoffMultiplier: 3,
    jitter: false,
  },
} as const;

// Default retry condition - retry on network errors, 5xx, 429, timeout
function defaultRetryCondition(error: any): boolean {
  // Don't retry on AbortError - these are intentional cancellations
  if (error.name === 'AbortError' || error.message?.includes('signal is aborted') || error.message?.includes('abort')) {
    return false;
  }
  
  // Network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // HTTP status codes that should be retried
  if (error.response?.status) {
    const status = error.response.status;
    return status >= 500 || status === 429 || status === 408; // 5xx, rate limit, timeout
  }
  
  // Fetch API errors (but not abort errors)
  if (error.name === 'TypeError' && error.message.includes('fetch') && !error.message.includes('abort')) {
    return true;
  }
  
  // Circuit breaker timeout errors
  if (error.name === 'CircuitBreakerTimeoutError') {
    return true;
  }
  
  return false;
}

export class RetryManager {
  private config: RetryConfig;
  private name: string;

  constructor(name: string, config: Partial<RetryConfig> = {}) {
    this.name = name;
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: defaultRetryCondition,
      ...config,
    };
  }

  async execute<T>(operation: () => Promise<T>, cancellationToken?: CancellationToken): Promise<T> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      // Check for cancellation before each attempt
      if (cancellationToken?.isCancelled) {
        throw new RetryCancelledException(`Operation cancelled during attempt ${attempt}`);
      }

      const attemptStart = Date.now();
      
      // Report progress before attempt
      const nextDelay = attempt < this.config.maxAttempts ? this.calculateDelay(attempt) : undefined;
      if (this.config.onProgress) {
        this.config.onProgress({
          currentAttempt: attempt,
          maxAttempts: this.config.maxAttempts,
          nextRetryDelay: nextDelay,
          isRetrying: attempt > 1,
          estimatedCompletion: nextDelay ? Date.now() + nextDelay : undefined,
        });
      }
      
      try {
        const result = await operation();
        
        // Success - record attempt and return
        attempts.push({
          attempt,
          delay: attempt > 1 ? attempts[attempt - 2]?.delay || 0 : 0,
          timestamp: attemptStart,
        });

        if (attempt > 1) {
          console.log(`✅ Retry success for ${this.name} on attempt ${attempt}/${this.config.maxAttempts}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        const shouldRetry = this.config.retryCondition?.(error) ?? defaultRetryCondition(error);
        
        attempts.push({
          attempt,
          delay: 0, // Will be set before next attempt
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: attemptStart,
        });

        // Don't retry if it's the last attempt or retry condition fails
        if (attempt === this.config.maxAttempts || !shouldRetry) {
          console.error(`❌ ${this.name} failed after ${attempt} attempts:`, error instanceof Error ? error.message : 'Unknown error');
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        attempts[attempts.length - 1].delay = delay;

        // Call retry callback if provided
        if (this.config.onRetry) {
          this.config.onRetry(attempt, delay, error);
        }
        
        console.warn(`⚠️ ${this.name} attempt ${attempt}/${this.config.maxAttempts} failed, retrying in ${delay}ms:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Report retry progress
        if (this.config.onProgress) {
          this.config.onProgress({
            currentAttempt: attempt,
            maxAttempts: this.config.maxAttempts,
            nextRetryDelay: delay,
            error: error instanceof Error ? error.message : 'Unknown error',
            isRetrying: true,
            estimatedCompletion: Date.now() + delay,
          });
        }
        
        // Wait with cancellation support
        await this.sleepWithCancellation(delay, cancellationToken);
      }
    }

    // All attempts failed
    const totalTime = Date.now() - startTime;
    console.error(`❌ ${this.name} failed permanently after ${attempts.length} attempts in ${totalTime}ms`);
    
    throw new RetryExhaustedException(
      `Operation failed after ${attempts.length} attempts`,
      {
        attempts,
        totalTime,
        lastError,
      }
    );
  }

  private calculateDelay(attempt: number): number {
    // Calculate exponential backoff delay
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add jitter to prevent thundering herd problem
    if (this.config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sleepWithCancellation(ms: number, cancellationToken?: CancellationToken): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), ms);
      
      // Check cancellation periodically during sleep
      const checkInterval = Math.min(ms / 10, 100); // Check every 100ms or 10% of delay
      const cancelCheck = setInterval(() => {
        if (cancellationToken?.isCancelled) {
          clearTimeout(timeout);
          clearInterval(cancelCheck);
          reject(new RetryCancelledException('Operation cancelled during retry delay'));
        }
      }, checkInterval);
      
      // Clean up interval when timeout completes
      setTimeout(() => clearInterval(cancelCheck), ms);
    });
  }

  // Create pre-configured retry managers for common scenarios
  static forNetworkErrors(name: string): RetryManager {
    return new RetryManager(name, retryConfigs.network);
  }

  static forRateLimit(name: string): RetryManager {
    return new RetryManager(name, retryConfigs.rateLimit);
  }

  static forServerErrors(name: string): RetryManager {
    return new RetryManager(name, retryConfigs.serverError);
  }

  static forTimeout(name: string): RetryManager {
    return new RetryManager(name, retryConfigs.timeout);
  }
}

// Custom exception for retry exhaustion
export class RetryExhaustedException extends Error {
  public attempts: RetryAttempt[];
  public totalTime: number;
  public lastError: any;

  constructor(message: string, details: { attempts: RetryAttempt[], totalTime: number, lastError: any }) {
    super(message);
    this.name = 'RetryExhaustedException';
    this.attempts = details.attempts;
    this.totalTime = details.totalTime;
    this.lastError = details.lastError;
  }
}

// Custom exception for retry cancellation
export class RetryCancelledException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryCancelledException';
  }
}

// Utility function for quick retry execution
export async function withRetry<T>(
  operation: () => Promise<T>,
  name: string,
  config?: Partial<RetryConfig>,
  cancellationToken?: CancellationToken
): Promise<T> {
  const retryManager = new RetryManager(name, config);
  return retryManager.execute(operation, cancellationToken);
}

// Helper function to create cancellation token
export function createCancellationToken(): CancellationToken {
  const token = {
    isCancelled: false,
    cancel: () => {
      token.isCancelled = true;
    }
  };
  return token;
}

// Pre-configured retry instances for common APIs
export const retryManagers = {
  weather: new RetryManager('Weather API', {
    ...retryConfigs.network,
    maxAttempts: 3,
    retryCondition: (error) => {
      // Retry on network errors and 5xx, but not on 401/403 (auth issues)
      if (error.response?.status) {
        const status = error.response.status;
        return status >= 500 || status === 429;
      }
      return defaultRetryCondition(error);
    }
  }),
  
  ai: new RetryManager('AI Service', {
    ...retryConfigs.serverError,
    maxAttempts: 2, // AI calls are expensive, limit retries
    baseDelay: 3000,
  }),
  
  maps: new RetryManager('Maps API', {
    ...retryConfigs.network,
    maxAttempts: 1, // Don't retry Maps API calls - they're usually user-initiated and time-sensitive
    retryCondition: (error) => {
      // Never retry AbortErrors or timeouts for Maps API
      if (error.name === 'AbortError' || error.message?.includes('signal is aborted') || error.message?.includes('abort')) {
        return false;
      }
      // Only retry on 5xx server errors, not rate limits or timeouts
      if (error.response?.status) {
        const status = error.response.status;
        return status >= 500; // Only 5xx errors
      }
      return defaultRetryCondition(error);
    }
  }),
  
  mapbox: new RetryManager('Mapbox API', {
    ...retryConfigs.network,
    maxAttempts: 3,
  }),
  
  database: new RetryManager('Database', {
    ...retryConfigs.serverError,
    maxAttempts: 2,
    baseDelay: 1000,
  }),
};

// Export types for external use
export type { RetryConfig, RetryProgress, RetryAttempt, RetryResult, CancellationToken };