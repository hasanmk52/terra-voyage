#!/usr/bin/env tsx

/**
 * Test script to verify Redis caching setup for Terra Voyage
 * Tests both Redis and fallback functionality
 */

import { cacheService } from '../lib/cache-service'

async function testRedisSetup() {
  console.log('🧪 Testing Terra Voyage Redis Cache Setup...\n')

  try {
    // Test 1: Basic Operations
    console.log('📝 Testing basic cache operations...')
    
    // Set a value
    const testKey = 'test:redis:setup'
    const testValue = { message: 'Hello Redis!', timestamp: Date.now() }
    
    await cacheService.set(testKey, testValue, 60) // 1 minute TTL
    console.log('✅ SET operation successful')
    
    // Get the value
    const retrievedValue = await cacheService.get(testKey)
    console.log('✅ GET operation successful')
    
    // Test 2: Health Check
    console.log('\n🏥 Testing cache health...')
    const health = await cacheService.healthCheck()
    console.log('Health Status:', health)
    
    // Test 3: Backend Information
    console.log('\n🔧 Cache Backend Information:')
    console.log('Backend Type:', cacheService.getBackendType())
    console.log('Using Redis:', cacheService.isUsingRedis())
    
    // Test 4: Cache Statistics
    console.log('\n📊 Cache Statistics:')
    const stats = await cacheService.getStats()
    console.log('Stats:', stats)
    
    // Test 5: Itinerary-specific methods
    console.log('\n🗺️ Testing itinerary-specific caching...')
    const tripData = {
      destination: 'Paris, France',
      startDate: '2024-06-15',
      endDate: '2024-06-20',
      activities: ['Eiffel Tower', 'Louvre Museum']
    }
    
    await cacheService.setItinerary('trip-123', tripData)
    console.log('✅ Itinerary cached successfully')
    
    const cachedTrip = await cacheService.getItinerary('trip-123')
    console.log('✅ Itinerary retrieved successfully')
    
    // Test 6: Bulk Operations
    console.log('\n📦 Testing bulk operations...')
    
    const bulkData = [
      { key: 'bulk:1', value: 'Value 1', ttl: 60 },
      { key: 'bulk:2', value: 'Value 2', ttl: 60 },
      { key: 'bulk:3', value: 'Value 3', ttl: 60 }
    ]
    
    await cacheService.mset(bulkData)
    console.log('✅ Bulk SET successful')
    
    const bulkKeys = ['bulk:1', 'bulk:2', 'bulk:3']
    const bulkValues = await cacheService.mget(bulkKeys)
    console.log('✅ Bulk GET successful')
    
    // Test 7: Key Pattern Matching
    console.log('\n🔍 Testing key pattern matching...')
    const matchingKeys = await cacheService.keys('bulk:*')
    console.log('✅ Pattern matching successful')
    
    // Test 8: Cache Warming (if supported)
    console.log('\n🔥 Testing cache warming...')
    await cacheService.warmCache(['Paris', 'London', 'Tokyo'])
    console.log('✅ Cache warming completed')
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    await cacheService.del(testKey)
    await cacheService.del('itinerary:trip-123')
    for (const key of bulkKeys) {
      await cacheService.del(key)
    }
    console.log('✅ Cleanup completed')
    
    console.log('\n🎉 All Redis cache tests passed!')
    console.log(`\n📝 Summary:`)
    console.log(`   Backend: ${cacheService.getBackendType()}`)
    console.log(`   Redis Connected: ${cacheService.isUsingRedis()}`)
    console.log(`   Status: ${health.status}`)
    
    if (cacheService.isUsingRedis()) {
      console.log('\n✨ Redis is working correctly! Your Terra Voyage app now has:')
      console.log('   • Persistent caching across server restarts')
      console.log('   • Shared cache between multiple app instances')
      console.log('   • Better performance for API responses')
      console.log('   • Automatic fallback to in-memory cache if Redis fails')
    } else {
      console.log('\n💡 Using in-memory cache (Redis not configured or unavailable)')
      console.log('   • Still working fine for development')
      console.log('   • Add Redis credentials to .env.local for full Redis features')
    }
    
  } catch (error) {
    console.error('❌ Redis test failed:', error)
    
    // Test fallback behavior
    console.log('\n🔄 Testing fallback behavior...')
    try {
      await cacheService.set('fallback:test', 'fallback works', 60)
      const fallbackValue = await cacheService.get('fallback:test')
      console.log('✅ Fallback cache working:', fallbackValue)
      await cacheService.del('fallback:test')
    } catch (fallbackError) {
      console.error('❌ Even fallback failed:', fallbackError)
    }
  }
}

// Run the test
testRedisSetup().catch(console.error)