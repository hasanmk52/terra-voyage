#!/usr/bin/env tsx

/**
 * Test script for Redis client implementation
 * Usage: npm run test:redis or tsx scripts/test-redis.ts
 */

import * as dotenv from 'dotenv';
import { createRedisClient, createEnhancedRedisClient } from '../lib/redis-client';
import { cacheService } from '../lib/cache-service';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testRedisClient() {
  console.log('🔧 Testing Redis Client Implementation\n');

  try {
    // Test 1: Check if Redis is configured
    console.log('1. Checking Redis configuration...');
    const hasRedisUrl = !!process.env.REDIS_REST_URL;
    const hasRedisToken = !!process.env.REDIS_REST_TOKEN;
    
    console.log(`   REDIS_REST_URL: ${hasRedisUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`   REDIS_REST_TOKEN: ${hasRedisToken ? '✅ Set' : '❌ Missing'}`);
    
    if (!hasRedisUrl || !hasRedisToken) {
      console.log('\n⚠️  Redis not configured. Add REDIS_REST_URL and REDIS_REST_TOKEN to .env.local');
      console.log('   Testing will continue with in-memory fallback.\n');
    }

    // Test 2: Create Redis client instance
    console.log('2. Creating Redis client...');
    let redisClient: any;
    
    try {
      redisClient = createRedisClient();
      console.log('   ✅ Redis client created successfully');
    } catch (error) {
      console.log('   ❌ Failed to create Redis client:', error);
      
      // Continue with SmartCache testing even if Redis fails
      console.log('   ➡️  Continuing with SmartCache testing...\n');
      
      // Skip Redis-specific tests and go to SmartCache
      console.log('7. Testing Smart Cache Service...');
      
      try {
        // Wait a moment for smart cache initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stats = await cacheService.getStats();
        console.log(`   Cache mode: ${stats.mode}`);
        console.log(`   Backend type: ${(cacheService as any).getBackendType?.() || 'unknown'}`);
        console.log(`   Using Redis: ${(cacheService as any).isUsingRedis?.() || false}`);
        
        // Test cache operations
        const testSetResult = await cacheService.set('smart:test', { data: 'test data' }, 300);
        const testGetResult = await cacheService.get('smart:test');
        console.log(`   Smart cache operations: ${testSetResult && testGetResult ? '✅' : '❌'}`);
        
        // Test itinerary methods
        const testItinerary = {
          destination: 'Paris',
          activities: ['Eiffel Tower', 'Louvre Museum'],
          duration: 3
        };
        
        const setItineraryResult = await cacheService.setItinerary('test-trip', testItinerary);
        const getItineraryResult = await cacheService.getItinerary('test-trip');
        
        console.log(`   Itinerary caching: ${setItineraryResult && getItineraryResult ? '✅' : '❌'}`);
        
        console.log('\n✅ Smart cache testing completed (Redis not configured)!');
      } catch (error) {
        console.log('   Smart cache test: ❌', error);
      }
      
      return;
    }

    // Test 3: Health check
    console.log('\n3. Testing connection health...');
    try {
      const health = await redisClient.healthCheck();
      console.log(`   Status: ${health.status}`);
      console.log(`   Connected: ${health.isConnected}`);
      if (health.latency) {
        console.log(`   Latency: ${health.latency}ms`);
      }
      if (health.error) {
        console.log(`   Error: ${health.error}`);
      }
    } catch (error) {
      console.log('   ❌ Health check failed:', error);
    }

    // Test 4: Basic operations
    console.log('\n4. Testing basic operations...');
    
    // SET operation
    try {
      const setResult = await redisClient.set('test:key', { message: 'Hello Redis!', timestamp: Date.now() }, 300);
      console.log(`   SET: ${setResult ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   SET: ❌', error);
    }

    // GET operation
    try {
      const getValue = await redisClient.get('test:key');
      console.log(`   GET: ${getValue ? '✅' : '❌'}`);
      if (getValue) {
        console.log(`   Value: ${JSON.stringify(getValue)}`);
      }
    } catch (error) {
      console.log('   GET: ❌', error);
    }

    // EXISTS operation
    try {
      const exists = await redisClient.exists('test:key');
      console.log(`   EXISTS: ${exists ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   EXISTS: ❌', error);
    }

    // Test 5: Advanced operations
    console.log('\n5. Testing advanced operations...');
    
    // MSET operation
    try {
      const msetResult = await redisClient.mset([
        { key: 'test:item1', value: 'value1', ttl: 300 },
        { key: 'test:item2', value: 'value2', ttl: 300 },
        { key: 'test:item3', value: 'value3', ttl: 300 }
      ]);
      console.log(`   MSET: ${msetResult ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   MSET: ❌', error);
    }

    // MGET operation
    try {
      const mgetResult = await redisClient.mget(['test:item1', 'test:item2', 'test:item3']);
      console.log(`   MGET: ${mgetResult && mgetResult.length === 3 ? '✅' : '❌'}`);
      if (mgetResult) {
        console.log(`   Values: ${JSON.stringify(mgetResult)}`);
      }
    } catch (error) {
      console.log('   MGET: ❌', error);
    }

    // KEYS operation
    try {
      const keys = await redisClient.keys('test:*');
      console.log(`   KEYS: ${keys && keys.length > 0 ? '✅' : '❌'}`);
      console.log(`   Found keys: ${keys.length}`);
    } catch (error) {
      console.log('   KEYS: ❌', error);
    }

    // Test 6: Enhanced Redis Cache with fallback
    console.log('\n6. Testing Enhanced Redis Cache with fallback...');
    
    try {
      const enhancedCache = createEnhancedRedisClient();
      const healthCheck = await enhancedCache.healthCheck();
      console.log(`   Enhanced cache health: ${healthCheck.status}`);
      console.log(`   Fallback active: ${(healthCheck as any).fallbackActive || false}`);
    } catch (error) {
      console.log('   Enhanced cache test: ❌', error);
    }

    // Test 7: Smart Cache Service
    console.log('\n7. Testing Smart Cache Service...');
    
    try {
      // Wait a moment for smart cache initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = await cacheService.getStats();
      console.log(`   Cache mode: ${stats.mode}`);
      console.log(`   Backend type: ${(cacheService as any).getBackendType?.() || 'unknown'}`);
      console.log(`   Using Redis: ${(cacheService as any).isUsingRedis?.() || false}`);
      
      // Test cache operations
      const testSetResult = await cacheService.set('smart:test', { data: 'test data' }, 300);
      const testGetResult = await cacheService.get('smart:test');
      console.log(`   Smart cache operations: ${testSetResult && testGetResult ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   Smart cache test: ❌', error);
    }

    // Test 8: Itinerary-specific methods
    console.log('\n8. Testing itinerary-specific methods...');
    
    try {
      const testItinerary = {
        destination: 'Paris',
        activities: ['Eiffel Tower', 'Louvre Museum'],
        duration: 3
      };
      
      const setItineraryResult = await cacheService.setItinerary('test-trip', testItinerary);
      const getItineraryResult = await cacheService.getItinerary('test-trip');
      
      console.log(`   Itinerary caching: ${setItineraryResult && getItineraryResult ? '✅' : '❌'}`);
      if (getItineraryResult) {
        console.log(`   Retrieved: ${JSON.stringify(getItineraryResult)}`);
      }
    } catch (error) {
      console.log('   Itinerary caching: ❌', error);
    }

    // Test 9: Cache warming
    console.log('\n9. Testing cache warming...');
    
    try {
      await cacheService.warmCache(['Paris', 'London', 'Tokyo']);
      console.log('   Cache warming: ✅');
    } catch (error) {
      console.log('   Cache warming: ❌', error);
    }

    // Test 10: Cleanup
    console.log('\n10. Cleaning up test data...');
    
    try {
      await redisClient.del(['test:key', 'test:item1', 'test:item2', 'test:item3']);
      await cacheService.del('smart:test');
      await cacheService.del('itinerary:test-trip');
      console.log('   Cleanup: ✅');
    } catch (error) {
      console.log('   Cleanup: ❌', error);
    }

    // Final stats
    console.log('\n📊 Final Statistics:');
    try {
      const finalStats = await cacheService.getStats();
      console.log(`   Cache size: ${finalStats.size}`);
      console.log(`   Active keys: ${finalStats.activeKeys}`);
      console.log(`   Mode: ${finalStats.mode}`);
    } catch (error) {
      console.log('   Stats unavailable:', error);
    }

    console.log('\n✅ Redis client testing completed!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testRedisClient()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}