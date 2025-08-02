require('dotenv').config({ path: '.env.local' })

async function testAPIErrorHandling() {
  console.log('🧪 Testing API error handling and coordinate fetching...\n')
  
  // Test 1: Valid coordinate fetching
  try {
    console.log('1. Testing valid destination coordinate fetching...')
    const { getDestinationCoordinatesFromAPI } = await import('./src/app/api/user/trips/route.ts')
    const coords = await getDestinationCoordinatesFromAPI('Tokyo, Japan')
    console.log('✅ Tokyo coordinates:', coords)
  } catch (error) {
    console.log('❌ Valid destination test failed:', error.message)
  }
  
  // Test 2: Invalid destination
  try {
    console.log('\n2. Testing invalid destination...')
    const { getDestinationCoordinatesFromAPI } = await import('./src/app/api/user/trips/route.ts')
    await getDestinationCoordinatesFromAPI('NonExistentPlace123XYZ')
    console.log('❌ Should have failed for invalid destination')
  } catch (error) {
    console.log('✅ Invalid destination properly rejected:', error.message)
  }
  
  // Test 3: Mapbox service directly
  try {
    console.log('\n3. Testing Mapbox service directly...')
    const mapboxConfig = await import('./lib/mapbox-config.ts')
    const MapboxService = mapboxConfig.MapboxService
    const mapboxService = new MapboxService()
    
    console.log('Token exists:', !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)
    
    const result = await mapboxService.getLocations('Hyderabad, India')
    if (result.features && result.features.length > 0) {
      const [lng, lat] = result.features[0].center
      console.log('✅ Hyderabad coordinates:', { lat, lng })
      console.log('   Full name:', result.features[0].place_name)
    } else {
      console.log('❌ No features returned')
    }
  } catch (error) {
    console.log('❌ Mapbox test failed:', error.message)
  }
  
  // Test 4: Weather API error handling
  try {
    console.log('\n4. Testing Weather API...')
    const { WeatherAPI } = await import('./lib/weather-api.ts')
    const weatherAPI = new WeatherAPI()
    
    const weather = await weatherAPI.getCurrentWeather({ lat: 17.3850, lng: 78.4867 })
    console.log('✅ Weather for Hyderabad:', weather.location, '-', weather.description)
  } catch (error) {
    console.log('❌ Weather test failed:', error.message)
  }
  
  console.log('\n🎉 API error handling tests completed!')
}

testAPIErrorHandling().catch(console.error)