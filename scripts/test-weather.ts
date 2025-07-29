#!/usr/bin/env tsx

// Test script for Weather API integration
import { WeatherAPI } from '../lib/weather-api';
import { useMockWeather } from '../lib/selective-mocks';

async function testWeatherAPI() {
  console.log('🌤️  Testing Weather API Integration...\n');
  
  // Test coordinates (New York City)
  const testLocation = { lat: 40.7128, lon: -74.0060 };
  
  console.log(`📍 Test Location: ${testLocation.lat}, ${testLocation.lon}`);
  console.log(`🔧 Using Mock Weather: ${useMockWeather}`);
  console.log(`🔑 API Key Present: ${process.env.WEATHER_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🔑 API Key Valid: ${process.env.WEATHER_API_KEY && process.env.WEATHER_API_KEY !== 'your-weather-api-key' ? 'Yes' : 'No'}\n`);
  
  const weatherAPI = new WeatherAPI();
  
  try {
    console.log('⏳ Testing Current Weather...');
    const currentWeather = await weatherAPI.getCurrentWeather(testLocation);
    
    if (currentWeather) {
      console.log('✅ Current Weather API successful');
      console.log(`   - Temperature: ${currentWeather.main?.temp || 'N/A'}°C`);
      console.log(`   - Condition: ${currentWeather.weather?.[0]?.description || 'N/A'}`);
      console.log(`   - City: ${currentWeather.name || 'N/A'}`);
    }
    
    console.log('\n⏳ Testing Weather Forecast...');
    const forecast = await weatherAPI.getWeatherForecast(testLocation);
    
    if (forecast) {
      console.log('✅ Weather Forecast API successful');
      console.log(`   - Forecast entries: ${forecast.list?.length || 0}`);
      console.log(`   - City: ${forecast.city?.name || 'N/A'}`);
    }
    
    console.log('\n⏳ Testing Weather Alerts...');
    const alerts = await weatherAPI.getWeatherAlerts(testLocation);
    
    if (alerts) {
      console.log('✅ Weather Alerts API successful');
      console.log(`   - Alert count: ${alerts.alerts?.length || 0}`);
    }
    
    console.log('\n🎉 All Weather API tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Weather API test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 To test with real API:');
      console.log('   1. Get API key from https://openweathermap.org/api');
      console.log('   2. Add WEATHER_API_KEY to your .env.local file');
      console.log('   3. Run this test again');
    }
  }
}

// Run the test
testWeatherAPI().catch(console.error);