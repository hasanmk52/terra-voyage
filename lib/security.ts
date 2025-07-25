import { z } from "zod"

// Input sanitization
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential XSS characters
    .slice(0, 1000) // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

// Validation schemas
export const idSchema = z.string().cuid()
export const emailSchema = z.string().email()
export const passwordSchema = z.string().min(8).max(128)

// Session validation (not compatible with Edge Runtime - use in API routes only)
// Moved to separate auth-utils.ts file for server-side usage

// Request validation middleware
export function validateRequest(schema: z.ZodSchema) {
  return async (data: any) => {
    try {
      const validated = schema.parse(data)
      return { success: true, data: validated }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: "Invalid input data",
          details: error.issues,
          status: 400,
        }
      }
      return { success: false, error: "Validation failed", status: 500 }
    }
  }
}

// Common security headers
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

// CORS configuration
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "production" 
    ? "https://your-domain.com" 
    : "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
}

// SQL injection prevention (additional layer)
export function preventSQLInjection(input: string): boolean {
  const suspiciousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(;|\-\-|\/\*|\*\/|'|")/,
    /(\b(OR|AND)\b.*=)/i,
  ]

  return !suspiciousPatterns.some(pattern => pattern.test(input))
}

// Request size limits
export const REQUEST_SIZE_LIMITS = {
  profile: 10 * 1024, // 10KB for profile updates
  trip: 50 * 1024, // 50KB for trip data
  upload: 5 * 1024 * 1024, // 5MB for file uploads
}

export function validateRequestSize(
  body: string | Buffer, 
  limit: number
): boolean {
  const size = typeof body === "string" ? 
    Buffer.byteLength(body, "utf8") : 
    body.length
  
  return size <= limit
}