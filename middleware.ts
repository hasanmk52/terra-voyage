import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { apiRateLimit, authRateLimit } from "@/lib/rate-limit"
import { securityHeaders, corsHeaders } from "@/lib/security"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply security headers to all requests
  const response = NextResponse.next()
  
  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Handle CORS for API routes
  if (pathname.startsWith("/api/")) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      const corsResponse = new NextResponse(null, { status: 200 })
      Object.entries(corsHeaders).forEach(([key, value]) => {
        corsResponse.headers.set(key, value)
      })
      return corsResponse
    }

    // Add CORS headers to API responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Apply rate limiting to API routes
    let rateLimitResult
    
    if (pathname.startsWith("/api/auth/")) {
      // Stricter rate limiting for auth endpoints
      rateLimitResult = await authRateLimit(request)
    } else {
      // General API rate limiting
      rateLimitResult = await apiRateLimit(request)
    }

    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
            ...corsHeaders,
          },
        }
      )
    }

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString())
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())
    response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString())
  }

  // Protect authenticated routes
  const protectedPaths = ["/dashboard", "/profile", "/settings"]
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    const token = await getToken({ req: request })
    
    if (!token) {
      const signInUrl = new URL("/auth/signin", request.url)
      signInUrl.searchParams.set("callbackUrl", request.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ["/auth/signin", "/auth/signup"]
  const isAuthPath = authPaths.includes(pathname)

  if (isAuthPath) {
    const token = await getToken({ req: request })
    
    if (token) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl")
      const redirectUrl = callbackUrl || "/dashboard"
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}