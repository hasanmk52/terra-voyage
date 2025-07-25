import { NextRequest } from "next/server"

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator } = options

  return async (request: NextRequest) => {
    // Generate key for rate limiting (default to IP address)
    const key = keyGenerator ? keyGenerator(request) : getClientIP(request)
    const now = Date.now()

    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k]
      }
    })

    // Get or create entry for this key
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    const entry = store[key]

    // Reset if window has expired
    if (entry.resetTime < now) {
      entry.count = 0
      entry.resetTime = now + windowMs
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    const isBlocked = entry.count > maxRequests
    const remaining = Math.max(0, maxRequests - entry.count)
    const resetTime = entry.resetTime

    return {
      success: !isBlocked,
      limit: maxRequests,
      remaining,
      resetTime,
    }
  }
}

function getClientIP(request: NextRequest): string {
  // Try various headers for IP address
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  const remote = request.headers.get("remote-addr")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  return real || remote || "unknown"
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per window
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 API calls per minute
})

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for sensitive endpoints
})