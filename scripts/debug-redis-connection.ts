#!/usr/bin/env tsx

/**
 * Debug script to test Redis connection step by step
 */

import { createEnhancedRedisClient } from '../lib/redis-client'

async function debugRedisConnection() {
  console.log('🔍 Debugging Redis Connection...\n')

  // Step 1: Check environment variables
  console.log('1️⃣ Environment Variables:')
  console.log('REDIS_REST_URL:', process.env.REDIS_REST_URL ? 'SET ✅' : 'NOT SET ❌')
  console.log('REDIS_REST_TOKEN:', process.env.REDIS_REST_TOKEN ? 'SET ✅' : 'NOT SET ❌')
  
  if (!process.env.REDIS_REST_URL || !process.env.REDIS_REST_TOKEN) {
    console.log('\n❌ Redis environment variables not set properly')
    return
  }

  // Step 2: Try to create Redis client
  console.log('\n2️⃣ Creating Redis Client:')
  try {
    const redisClient = createEnhancedRedisClient()
    console.log('✅ Redis client created successfully')

    // Step 3: Test connection
    console.log('\n3️⃣ Testing Connection:')
    const health = await redisClient.healthCheck()
    console.log('Health check result:', health)

    if (health.isConnected) {
      console.log('✅ Redis connection successful!')
      
      // Step 4: Test basic operations
      console.log('\n4️⃣ Testing Basic Operations:')
      
      const testKey = 'debug:test'
      const testValue = { test: 'data', timestamp: Date.now() }
      
      console.log('Setting test data...')
      const setResult = await redisClient.set(testKey, testValue, 60)
      console.log('SET result:', setResult)
      
      console.log('Getting test data...')
      const getValue = await redisClient.get(testKey)
      console.log('GET result:', getValue)
      
      console.log('Cleaning up...')
      await redisClient.del(testKey)
      
      console.log('\n🎉 Redis is working correctly!')
      
    } else {
      console.log('❌ Redis health check failed:', health.error)
    }

  } catch (error) {
    console.log('❌ Redis client creation failed:', error)
  }
}

// Run the debug
debugRedisConnection().catch(console.error)