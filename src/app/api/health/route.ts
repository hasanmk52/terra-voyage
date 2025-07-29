import { NextResponse } from "next/server"
import { healthCheck } from "@/lib/db-performance"
import { getCircuitBreakerStatus, circuitBreakers } from "@/lib/circuit-breaker"
import { aiService } from "@/lib/ai-service"

export async function GET() {
  try {
    const [dbHealth, circuitBreakerStatus] = await Promise.all([
      healthCheck(),
      Promise.resolve(getCircuitBreakerStatus())
    ])
    
    // Get AI service health
    const aiHealth = await aiService.healthCheck().catch(error => ({
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))

    // Determine overall status
    const circuitBreakersHealthy = circuitBreakerStatus.every(cb => cb.status === 'CLOSED')
    const overallStatus = dbHealth.status === "healthy" && circuitBreakersHealthy && aiHealth.status === 'healthy' 
      ? "healthy" 
      : "degraded"
    
    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
      database: dbHealth,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      
      // Enhanced monitoring for circuit breakers and error handling
      error_handling: {
        circuit_breakers: circuitBreakerStatus.map(cb => ({
          service: cb.name,
          status: cb.status,
          failure_count: cb.failureCount,
          healthy: cb.status === 'CLOSED',
          stats: {
            total_requests: cb.stats.totalRequests,
            successful_requests: cb.stats.successfulRequests,
            failed_requests: cb.stats.failedRequests,
            success_rate: cb.stats.totalRequests > 0 
              ? Math.round((cb.stats.successfulRequests / cb.stats.totalRequests) * 100) 
              : 100
          }
        })),
        
        services: {
          ai: {
            health: aiHealth,
            usage_stats: aiService.getUsageStats()
          }
        }
      },

      api_keys: {
        ai_configured: !!process.env.GEMINI_API_KEY,
        weather_configured: !!process.env.WEATHER_API_KEY,
        maps_configured: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        mapbox_configured: !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
        database_configured: !!process.env.DATABASE_URL,
      }
    }

    const status = overallStatus === "healthy" ? 200 : 503
    
    return NextResponse.json(health, { status })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        error_handling: {
          circuit_breakers: [],
          services: {}
        }
      },
      { status: 503 }
    )
  }
}

// Simple health check endpoint for monitoring services
export async function HEAD() {
  try {
    const [dbHealth, circuitBreakerStatus] = await Promise.all([
      healthCheck(),
      Promise.resolve(getCircuitBreakerStatus())
    ])
    
    const circuitBreakersHealthy = circuitBreakerStatus.every(cb => cb.status === 'CLOSED')
    const overallHealthy = dbHealth.status === "healthy" && circuitBreakersHealthy
    
    return new Response(null, {
      status: overallHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': overallHealthy ? 'healthy' : 'degraded',
        'X-Timestamp': new Date().toISOString(),
        'X-Circuit-Breakers': circuitBreakerStatus.map(cb => `${cb.name}:${cb.status}`).join(','),
      }
    })
  } catch (error) {
    return new Response(null, {
      status: 500,
      headers: {
        'X-Health-Status': 'error',
        'X-Timestamp': new Date().toISOString(),
      }
    })
  }
}