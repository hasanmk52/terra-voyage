import { GoogleGenerativeAI } from "@google/generative-ai";
import { circuitBreakers } from "./circuit-breaker";
import { retryManagers } from "./retry-logic";
import {
  RetryProgress,
  CancellationToken,
  RetryConfig,
  RetryCancelledException,
  RetryExhaustedException,
  retryConfigs,
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
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    this.model = this.client.getGenerativeModel({ model: modelName });

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
      maxTokens = 20000, // Increased from 12000 to prevent truncation for complex itineraries
      temperature = 0.8,
      timeout = 180000, // Increased to 3 minutes for longer generations
      onProgress,
      cancellationToken,
    } = options;

    if (!this.model) {
      throw new Error("AI client not initialized - model is null");
    }

    // Create retry manager with progress callback
    // Using rateLimit config: 5 attempts with 2s, 5s, 12.5s, 30s, 30s delays
    // This handles Gemini's 60-second rate limit window properly
    const retryManager = new (await import("./retry-logic")).RetryManager(
      "AI Service",
      {
        ...retryConfigs.rateLimit, // 5 attempts, longer delays for rate limits
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
        }
      }
    });
  }
}

export const aiService = new AIService();
