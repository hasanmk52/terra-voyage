import { NextResponse } from 'next/server'
import { cacheService } from '@/lib/cache-service'

export async function GET() {
  try {
    const stats = await cacheService.getStats()
    const health = await cacheService.healthCheck()
    
    return NextResponse.json({
      success: true,
      cache: {
        backend: cacheService.getBackendType(),
        usingRedis: cacheService.isUsingRedis(),
        stats,
        health
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cache: {
        backend: 'unknown',
        usingRedis: false
      }
    }, { status: 500 })
  }
}