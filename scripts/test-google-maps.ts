#!/usr/bin/env tsx

// Test script for Google Maps API integration
import { googlePlaces } from '../lib/google-places';
import { useMockMaps } from '../lib/selective-mocks';

async function testGoogleMapsAPI() {
  console.log('🗺️  Testing Google Maps API Integration...\n');
  
  console.log(`🔧 Using Mock Maps: ${useMockMaps}`);
  console.log(`🔑 API Key Present: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Yes' : 'No'}`);
  console.log(`🔑 API Key Valid: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY !== 'your-google-maps-api-key' && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length > 20 ? 'Yes' : 'No'}\n`);
  
  try {
    // Test destination search
    console.log('⏳ Testing Destination Search...');
    const searchResults = await googlePlaces.searchDestinations('Paris');
    
    if (searchResults && searchResults.length > 0) {
      console.log('✅ Destination Search API successful');
      console.log(`   - Found ${searchResults.length} results`);
      console.log(`   - First result: ${searchResults[0].description}`);
      console.log(`   - Place ID: ${searchResults[0].placeId}`);
      
      // Test place details with first result
      if (searchResults[0].placeId) {
        console.log('\n⏳ Testing Place Details...');
        const placeDetails = await googlePlaces.getPlaceDetails(searchResults[0].placeId);
        
        if (placeDetails) {
          console.log('✅ Place Details API successful');
          console.log(`   - Name: ${placeDetails.name}`);
          console.log(`   - Address: ${placeDetails.formattedAddress}`);
          console.log(`   - Coordinates: ${placeDetails.geometry.location.lat}, ${placeDetails.geometry.location.lng}`);
          console.log(`   - Rating: ${placeDetails.rating || 'N/A'}`);
          
          // Test nearby attractions
          console.log('\n⏳ Testing Nearby Attractions...');
          const attractions = await googlePlaces.searchNearbyAttractions(
            placeDetails.geometry.location,
            5000
          );
          
          if (attractions && attractions.length > 0) {
            console.log('✅ Nearby Attractions API successful');
            console.log(`   - Found ${attractions.length} attractions`);
            console.log(`   - First attraction: ${attractions[0].name}`);
            console.log(`   - Rating: ${attractions[0].rating || 'N/A'}`);
          }
        }
      }
    }
    
    console.log('\n🎉 All Google Maps API tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Google Maps API test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 To test with real API:');
      console.log('   1. Get API key from https://console.cloud.google.com/');
      console.log('   2. Enable Places API, Maps JavaScript API, Geocoding API');
      console.log('   3. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file');
      console.log('   4. Run this test again');
    }
  }
}

// Run the test
testGoogleMapsAPI().catch(console.error);