#!/usr/bin/env npx tsx

import { weatherService } from '../lib/weather-service';
import { weatherRecommendationEngine } from '../lib/weather-recommendations';

// Test coordinates for major cities
const testLocations = [
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Invalid Location', lat: 999, lng: 999 } // Test error handling
];

const testActivities = [
  { name: 'Visit Central Park', type: 'attraction', description: 'outdoor park walking sightseeing' },
  { name: 'Museum Visit', type: 'attraction', description: 'indoor museum art gallery' },
  { name: 'Beach Day', type: 'attraction', description: 'outdoor beach swimming sun' },
  { name: 'Restaurant Dinner', type: 'restaurant', description: 'indoor dining fine dining' }
];

async function testWeatherService() {
  console.log('🧪 Testing Weather Fallback Service');
  console.log('=' .repeat(50));

  // Test each location
  for (const location of testLocations) {
    console.log(`\n📍 Testing ${location.name} (${location.lat}, ${location.lng})`);
    console.log('-'.repeat(30));

    try {
      const startTime = Date.now();
      
      // Test weather forecast
      const forecast = await weatherService.getWeatherForecast(
        location.lat,
        location.lng,
        location.name
      );

      const duration = Date.now() - startTime;
      
      console.log(`✅ Weather fetch successful in ${duration}ms`);
      console.log(`   Source: ${forecast.source}`);
      console.log(`   Current: ${forecast.current.temperature.current}°C, ${forecast.current.condition.description}`);
      console.log(`   Forecast: ${forecast.forecast.length} days`);
      console.log(`   Last updated: ${new Date(forecast.lastUpdated).toLocaleString()}`);

      // Test recommendations
      const recommendations = weatherRecommendationEngine.generateRecommendations(
        forecast,
        testActivities
      );

      console.log(`   Clothing items: ${recommendations.clothing.length}`);
      console.log(`   Activity assessments: ${recommendations.activities.length}`);
      console.log(`   Packing items: ${recommendations.packing.length}`);
      console.log(`   Weather alerts: ${recommendations.alerts.length}`);
      console.log(`   Daily tips: ${recommendations.dailyTips.length}`);

      // Show sample recommendations
      if (recommendations.clothing.length > 0) {
        const essential = recommendations.clothing.filter(c => c.priority === 'essential');
        if (essential.length > 0) {
          console.log(`   Essential clothing: ${essential[0].items.join(', ')}`);
        }
      }

      if (recommendations.alerts.length > 0) {
        console.log(`   Weather alerts: ${recommendations.alerts.map(a => a.title).join(', ')}`);
      }

    } catch (error) {
      if (location.name === 'Invalid Location') {
        console.log(`✅ Expected error for invalid location: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        console.log(`❌ Failed to fetch weather: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Test monitoring stats
  console.log('\n📊 Service Monitoring Stats');
  console.log('-'.repeat(30));
  const stats = weatherService.getMonitoringStats();
  console.log(`Total requests: ${stats.requests}`);
  console.log(`Successful: ${stats.successes}`);
  console.log(`Failed: ${stats.failures}`);
  console.log(`Success rate: ${stats.requests > 0 ? Math.round((stats.successes / stats.requests) * 100) : 0}%`);
  console.log(`Cache size: ${stats.cacheSize}`);
  
  console.log('\nProvider Statistics:');
  Object.entries(stats.providerStats).forEach(([provider, providerStats]: [string, any]) => {
    const successRate = providerStats.requests > 0 ? Math.round((providerStats.successes / providerStats.requests) * 100) : 0;
    console.log(`  ${provider}: ${successRate}% (${providerStats.successes}/${providerStats.requests})`);
  });
}

async function testCachePerformance() {
  console.log('\n⚡ Testing Cache Performance');
  console.log('-'.repeat(30));

  const testLocation = testLocations[0]; // New York
  
  // First request (should hit API)
  const start1 = Date.now();
  await weatherService.getWeatherForecast(testLocation.lat, testLocation.lng, testLocation.name);
  const duration1 = Date.now() - start1;
  console.log(`First request: ${duration1}ms (API call)`);

  // Second request (should hit cache)
  const start2 = Date.now();
  await weatherService.getWeatherForecast(testLocation.lat, testLocation.lng, testLocation.name);
  const duration2 = Date.now() - start2;
  console.log(`Second request: ${duration2}ms (cache hit)`);

  const speedup = Math.round((duration1 / duration2) * 100) / 100;
  console.log(`Cache speedup: ${speedup}x faster`);
}

async function testRecommendationEngine() {
  console.log('\n🎯 Testing Recommendation Engine');
  console.log('-'.repeat(30));

  try {
    const testLocation = testLocations[0]; // New York
    const forecast = await weatherService.getWeatherForecast(
      testLocation.lat,
      testLocation.lng,
      testLocation.name
    );

    const recommendations = weatherRecommendationEngine.generateRecommendations(
      forecast,
      testActivities
    );

    console.log('Clothing Recommendations:');
    recommendations.clothing.forEach(item => {
      console.log(`  ${item.category} (${item.priority}): ${item.items.join(', ')}`);
      console.log(`    Reason: ${item.reason}`);
    });

    console.log('\nActivity Assessments:');
    recommendations.activities.forEach(activity => {
      console.log(`  ${activity.activityName} (${activity.location}): ${activity.suitabilityScore}/100 (${activity.impact})`);
      if (activity.recommendations.length > 0) {
        console.log(`    Tips: ${activity.recommendations[0]}`);
      }
    });

    console.log('\nPacking Highlights:');
    const essential = recommendations.packing.filter(item => item.priority === 'essential');
    essential.slice(0, 3).forEach(item => {
      console.log(`  Essential: ${item.item} - ${item.reason}`);
    });

    if (recommendations.alerts.length > 0) {
      console.log('\nWeather Alerts:');
      recommendations.alerts.forEach(alert => {
        console.log(`  ${alert.severity.toUpperCase()}: ${alert.title}`);
        console.log(`    ${alert.description}`);
      });
    }

  } catch (error) {
    console.log(`❌ Recommendation test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  console.log('-'.repeat(30));

  // Test invalid coordinates
  try {
    await weatherService.getWeatherForecast(999, 999, 'Invalid Location');
    console.log('❌ Should have thrown error for invalid coordinates');
  } catch (error) {
    console.log('✅ Correctly handled invalid coordinates');
  }

  // Test network timeout simulation
  console.log('Testing fallback chain behavior...');
  
  // Clear cache to force fresh requests
  weatherService.clearCache();
  
  // Test with a valid location to see fallback behavior
  try {
    const forecast = await weatherService.getWeatherForecast(40.7128, -74.0060, 'New York');
    console.log(`✅ Fallback chain working, got data from: ${forecast.source}`);
  } catch (error) {
    console.log(`⚠️ All providers failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function main() {
  console.log('🌤️ Weather API Fallback Chain Test Suite');
  console.log('==========================================\n');

  try {
    await testWeatherService();
    await testCachePerformance();
    await testRecommendationEngine();
    await testErrorHandling();

    console.log('\n🎉 Test Suite Complete!');
    console.log('Check the results above to verify all components are working correctly.');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as testWeatherFallback };