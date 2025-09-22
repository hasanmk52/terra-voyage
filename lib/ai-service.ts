import { GoogleGenerativeAI } from "@google/generative-ai";
import { circuitBreakers } from "./circuit-breaker";
import { retryManagers } from "./retry-logic";
import {
  RetryProgress,
  CancellationToken,
  RetryConfig,
  RetryCancelledException,
  RetryExhaustedException,
} from "./retry-logic";

// AI Service configuration
class AIService {
  private client: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isInitialized = false;

  constructor() {
    // Initialize client only when needed
  }

  private async initialize() {
    if (this.isInitialized) return;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });

    this.isInitialized = true;
  }

  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
      onProgress?: (progress: RetryProgress) => void;
      cancellationToken?: CancellationToken;
    } = {}
  ): Promise<string> {
    await this.initialize();

    const {
      maxTokens = 12000,
      temperature = 0.7,
      timeout = 120000, // Increase to 2 minutes - don't artificially limit AI
      onProgress,
      cancellationToken,
    } = options;

    if (!this.model) {
      throw new Error("AI client not initialized - model is null");
    }

    // Create retry manager with progress callback
    const retryManager = new (await import("./retry-logic")).RetryManager(
      "AI Service",
      {
        maxAttempts: 3, // FR-003.1: Up to 3 retry attempts
        baseDelay: 1000, // FR-003.1: 1s, 2s, 4s delays (exponential backoff)
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true,
        onProgress,
        retryCondition: (error) => {
          // FR-003.1: Distinguish retryable vs permanent failures
          const errorMessage = error?.message || "";

          // Permanent failures - don't retry
          if (
            errorMessage.includes("AUTHENTICATION_ERROR") ||
            errorMessage.includes("AI_QUOTA_EXCEEDED")
          ) {
            return false;
          }

          // Retryable errors
          return (
            errorMessage.includes("AI_SERVICE_TIMEOUT") ||
            errorMessage.includes("SERVICE_UNAVAILABLE") ||
            errorMessage.includes("RATE_LIMIT_ERROR") ||
            errorMessage.includes("network") ||
            errorMessage.includes("503") ||
            errorMessage.includes("502") ||
            errorMessage.includes("timeout")
          );
        },
      }
    );

    // Execute with retry logic and cancellation support
    return retryManager.execute(async () => {
      // Create generation config
      const generationConfig = {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      };

      // Generate content with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`AI request timeout after ${timeout}ms`)),
          timeout
        )
      );

      const generatePromise = this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      try {
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        const content = response.text();

        if (!content) {
          throw new Error("AI returned empty response - no content generated");
        }

        console.log(`✅ AI generated ${content.length} characters`);
        return content;
      } catch (error) {
        // Provide categorized error information for better user experience
        if (error instanceof Error) {
          if (error.message.includes("timeout")) {
            throw new Error(
              `AI_SERVICE_TIMEOUT: Request timed out after ${timeout}ms`
            );
          }
          if (
            error.message.includes("quota") ||
            error.message.includes("limit")
          ) {
            throw new Error(`AI_QUOTA_EXCEEDED: Service quota exceeded`);
          }
          if (error.message.includes("rate")) {
            throw new Error(`RATE_LIMIT_ERROR: Too many requests, please wait`);
          }
          if (error.message.includes("key") || error.message.includes("auth")) {
            throw new Error(`AUTHENTICATION_ERROR: Invalid API key`);
          }
          if (
            error.message.includes("unavailable") ||
            error.message.includes("503")
          ) {
            throw new Error(
              `SERVICE_UNAVAILABLE: AI service temporarily unavailable`
            );
          }
          throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
        }
        throw new Error(`UNKNOWN_ERROR: ${error}`);
      }
    }, cancellationToken);
  }

  async generateJSON<T>(
    prompt: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
      onProgress?: (progress: RetryProgress) => void;
      cancellationToken?: CancellationToken;
    } = {}
  ): Promise<T> {
    const jsonPrompt = `${prompt}

IMPORTANT: Return only valid JSON. No additional text or explanation.`;

    const response = await this.generateCompletion(jsonPrompt, {
      ...options,
      onProgress: options.onProgress,
      cancellationToken: options.cancellationToken,
    });

    try {
      // Clean up response - remove code blocks if present
      let cleanResponse = response.trim();

      // Remove markdown code blocks more aggressively
      cleanResponse = cleanResponse
        .replace(/^```json\s*/i, "") // Start of json code block
        .replace(/^```\s*/i, "") // Start of generic code block
        .replace(/\s*```\s*$/i, "") // End of code block
        .replace(/^\s*```json\s*/gim, "") // Multiple json blocks
        .replace(/^\s*```\s*/gim, "") // Multiple generic blocks
        .replace(/\s*```\s*$/gim, "") // Multiple end blocks
        .trim();

      // Also try to find JSON content between any remaining backticks
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      return JSON.parse(cleanResponse) as T;
    } catch (error) {
      console.error(
        "JSON parsing failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error(
        "Cleaned response (first 500 chars):",
        response.substring(0, 500)
      );
      throw new Error(
        `Invalid JSON response from AI: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.generateCompletion('Say "OK" if you can respond.', {
        maxTokens: 10,
        timeout: 10000,
      });
      const latency = Date.now() - startTime;

      return {
        status: "healthy" as const,
        latency,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get usage statistics (if available)
  getUsageStats() {
    return {
      requestCount: 0, // Would track this in production
      totalTokens: 0, // Would track this in production
      errors: 0, // Would track this in production
      mode: "live",
    };
  }
}

// Rate limiting and error handling wrapper
class RateLimitedAIService {
  private aiService: AIService;
  private requestQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    request: () => Promise<any>;
  }> = [];
  private isProcessing = false;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequestsPerMinute = 60;

  constructor() {
    this.aiService = new AIService();
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      // Check rate limit
      const now = Date.now();
      if (now - this.windowStart > 60000) {
        // Reset window
        this.windowStart = now;
        this.requestCount = 0;
      }

      if (this.requestCount >= this.maxRequestsPerMinute) {
        // Wait until next window
        const waitTime = 60000 - (now - this.windowStart);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      const { resolve, reject, request } = this.requestQueue.shift()!;
      this.requestCount++;

      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  private enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, request });
      this.processQueue();
    });
  }

  async generateCompletion(
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
      onProgress?: (progress: RetryProgress) => void;
      cancellationToken?: CancellationToken;
    }
  ): Promise<string> {
    return this.enqueueRequest(() =>
      this.aiService.generateCompletion(prompt, options)
    );
  }

  async generateJSON<T>(
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
      onProgress?: (progress: RetryProgress) => void;
      cancellationToken?: CancellationToken;
    }
  ): Promise<T> {
    return this.enqueueRequest(() =>
      this.aiService.generateJSON<T>(prompt, options)
    );
  }

  async healthCheck() {
    return this.aiService.healthCheck();
  }

  getUsageStats() {
    return {
      ...this.aiService.getUsageStats(),
      queueLength: this.requestQueue.length,
      requestsThisMinute: this.requestCount,
    };
  }
}

// Export singleton instance
export const aiService = new RateLimitedAIService();

// Export types for use in other modules
export interface AIGenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  onProgress?: (progress: RetryProgress) => void;
  cancellationToken?: CancellationToken;
}

export interface AIHealthStatus {
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
}
