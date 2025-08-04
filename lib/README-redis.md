# Redis Client Implementation for Terra Voyage

This document explains the Redis client implementation using Upstash Redis REST API, which provides a scalable caching solution that seamlessly integrates with the existing cache service.

## Overview

The Redis implementation consists of three main components:

1. **RedisClient** - Core Redis client using Upstash REST API
2. **EnhancedRedisCache** - Redis client with automatic fallback to in-memory cache
3. **SmartCache** - Intelligent cache service that automatically chooses between Redis and in-memory backends

## Features

### ✅ Core Redis Operations
- **SET/GET/DEL** - Basic key-value operations with TTL support
- **MSET/MGET** - Bulk operations for better performance
- **EXISTS/KEYS** - Key existence checks and pattern matching
- **EXPIRE/TTL** - TTL management and expiration handling
- **CLEAR** - Database flush operations

### ✅ Advanced Features
- **Health Monitoring** - Connection status and latency tracking
- **Error Handling** - Comprehensive error handling with fallback behavior
- **Automatic Fallback** - Falls back to in-memory cache when Redis is unavailable
- **Connection Management** - Automatic reconnection and status tracking
- **Performance Monitoring** - Cache statistics and performance metrics

### ✅ Terra Voyage Integration
- **Compatible Interface** - Drop-in replacement for existing cache service
- **Itinerary Caching** - Specialized methods for trip and itinerary caching
- **Cache Warming** - Pre-populate cache with destination data
- **Smart Backend Selection** - Automatically chooses optimal caching backend

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Redis Configuration (Upstash)
REDIS_REST_URL="https://your-database-name.upstash.io"
REDIS_REST_TOKEN="your-upstash-redis-rest-token"
```

### Getting Upstash Redis Credentials

1. Sign up at [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Go to the database details page
4. Copy the REST API URL and token from the "REST API" section

## Usage Examples

### Basic Usage

```typescript
import { redisClient } from './lib/redis-client';

// Set a value with TTL
await redisClient.set('user:123', { name: 'John Doe' }, 3600);

// Get a value
const user = await redisClient.get('user:123');

// Check if key exists
const exists = await redisClient.exists('user:123');

// Delete a key
await redisClient.del('user:123');
```

### Smart Cache Service (Recommended)

```typescript
import { cacheService } from './lib/cache-service';

// The service automatically chooses Redis or in-memory cache
await cacheService.set('trip:paris', tripData, 86400);
const trip = await cacheService.get('trip:paris');

// Itinerary-specific methods
await cacheService.setItinerary('user-trip-123', itineraryData);
const itinerary = await cacheService.getItinerary('user-trip-123');

// Cache warming for better performance
await cacheService.warmCache(['Paris', 'London', 'Tokyo']);
```

### Enhanced Redis Cache with Fallback

```typescript
import { enhancedRedisClient } from './lib/redis-client';

// Automatically falls back to memory cache if Redis fails
await enhancedRedisClient.set('key', 'value');
const value = await enhancedRedisClient.get('key');

// Check fallback status
const health = await enhancedRedisClient.healthCheck();
console.log('Fallback active:', health.fallbackActive);
```

### Bulk Operations

```typescript
// Set multiple keys at once
await redisClient.mset([
  { key: 'user:1', value: { name: 'Alice' }, ttl: 3600 },
  { key: 'user:2', value: { name: 'Bob' }, ttl: 3600 },
  { key: 'user:3', value: { name: 'Charlie' }, ttl: 3600 }
]);

// Get multiple keys at once
const users = await redisClient.mget(['user:1', 'user:2', 'user:3']);
```

### Cache-Aside Pattern

```typescript
// Get or set with automatic cache population
const userData = await redisClient.getOrSet(
  'user:123',
  async () => {
    // This function only runs if cache miss
    return await fetchUserFromDatabase(123);
  },
  3600 // TTL in seconds
);
```

## Architecture

### Backend Selection Flow

```
Application Start
       ↓
Check Redis Configuration
       ↓
   [Configured?] ──No──→ Use In-Memory Cache
       ↓ Yes
Test Redis Connection
       ↓
   [Connected?] ──No──→ Use In-Memory Cache
       ↓ Yes            (Log warning)
   Use Redis Backend
       ↓
  Monitor Health
       ↓
[Connection Lost?] ──Yes──→ Fallback to Memory
       ↓ No                (Auto-retry Redis)
  Continue with Redis
```

### Error Handling Strategy

1. **Network Errors** - Automatic fallback to in-memory cache
2. **API Errors** - Retry with exponential backoff, then fallback
3. **Parsing Errors** - Return null, log error for debugging
4. **Configuration Errors** - Fail fast with descriptive error messages

## Performance Considerations

### Cache Performance
- **Redis**: ~1-5ms latency for simple operations
- **Memory**: ~0.1ms latency for simple operations
- **Network**: Depends on Upstash region and connection quality

### Optimization Tips
1. **Use Bulk Operations** - `mget`/`mset` for multiple keys
2. **Appropriate TTL** - Set reasonable expiration times
3. **Key Patterns** - Use consistent, searchable key naming
4. **Monitor Health** - Regular health checks for early problem detection

### Memory vs Redis Trade-offs

| Feature | In-Memory | Redis |
|---------|-----------|-------|
| Speed | Fastest | Fast |
| Persistence | None | Persistent |
| Scalability | Limited | Excellent |
| Sharing | Single process | Multi-process |
| Memory | Process memory | External |
| Reliability | Process-bound | High availability |

## Monitoring and Debugging

### Health Checks

```typescript
// Check Redis connection health
const health = await redisClient.healthCheck();
console.log('Status:', health.status);
console.log('Connected:', health.isConnected);
console.log('Latency:', health.latency);
```

### Cache Statistics

```typescript
// Get cache statistics
const stats = await cacheService.getStats();
console.log('Cache mode:', stats.mode);
console.log('Total keys:', stats.size);
console.log('Active keys:', stats.activeKeys);
```

### Backend Information

```typescript
// Check which backend is being used
console.log('Backend type:', cacheService.getBackendType());
console.log('Using Redis:', cacheService.isUsingRedis());
```

## Testing

### Running Tests

```bash
# Test Redis client functionality
npm run test:redis

# Test with environment setup
npm run test:env
```

### Test Coverage

The test suite covers:
- ✅ Configuration validation
- ✅ Connection health checks
- ✅ Basic CRUD operations
- ✅ Bulk operations
- ✅ Advanced Redis commands
- ✅ Fallback behavior
- ✅ Error handling
- ✅ Performance monitoring
- ✅ Itinerary-specific operations

## Migration Guide

### From In-Memory to Redis

1. **Add Redis Configuration**:
   ```bash
   REDIS_REST_URL="https://your-db.upstash.io"
   REDIS_REST_TOKEN="your-token"
   ```

2. **No Code Changes Required**:
   The `SmartCache` automatically uses Redis when available.

3. **Verify Operation**:
   ```bash
   npm run test:redis
   ```

### Existing Code Compatibility

```typescript
// This code works unchanged
import { cacheService } from './lib/cache-service';

// All existing methods work the same way
await cacheService.set('key', 'value');
const value = await cacheService.get('key');
await cacheService.setItinerary('trip', data);
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Verify `REDIS_REST_URL` and `REDIS_REST_TOKEN`
   - Check Upstash database status
   - Verify network connectivity

2. **Slow Performance**
   - Check Redis region vs. application region
   - Monitor network latency
   - Consider bulk operations for multiple keys

3. **Memory Fallback Active**
   - Redis temporarily unavailable
   - Check logs for connection errors
   - System will auto-retry Redis connection

4. **Authentication Errors**
   - Verify REST token is correct
   - Check token permissions in Upstash console
   - Ensure token hasn't expired

### Debug Logging

```typescript
// Enable detailed logging
process.env.DEBUG = 'redis:*';

// Or use health checks for status
const health = await redisClient.healthCheck();
if (!health.isConnected) {
  console.log('Redis issue:', health.error);
}
```

## Security Considerations

### Best Practices
1. **Environment Variables** - Never commit Redis credentials to version control
2. **Token Rotation** - Regularly rotate Redis REST tokens
3. **Network Security** - Use HTTPS-only connections (enforced by Upstash)
4. **Data Sensitivity** - Don't cache sensitive data without encryption
5. **TTL Management** - Set appropriate expiration times for all keys

### Data Handling
- All data is automatically JSON-serialized
- No sensitive data is logged in error messages
- Connection errors don't expose credentials
- Automatic cleanup of expired keys

## Future Enhancements

### Planned Features
- [ ] Connection pooling for better performance
- [ ] Redis Streams for real-time updates  
- [ ] Distributed locking for cache coordination
- [ ] Cache invalidation strategies
- [ ] Redis pub/sub for cache synchronization
- [ ] Compression for large values
- [ ] Custom serialization options

### Performance Improvements
- [ ] Pipelining for bulk operations
- [ ] Client-side caching layer
- [ ] Intelligent prefetching
- [ ] Cache warming strategies
- [ ] Memory usage optimization

This Redis implementation provides a robust, scalable caching solution that seamlessly integrates with Terra Voyage's existing architecture while providing automatic fallback capabilities and comprehensive monitoring.