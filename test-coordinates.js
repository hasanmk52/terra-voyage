require('dotenv').config({ path: '.env.local' })

async function testCoordinates() {
  try {
    const mapboxConfig = await import('./lib/mapbox-config.ts');
    const MapboxService = mapboxConfig.MapboxService;
    const mapboxService = new MapboxService();
    
    console.log('🧪 Testing coordinate fetching...');
    console.log('Token exists:', !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
    
    const destinations = [
      'Hyderabad, Telangana, India',
      'Paris, France', 
      'Tokyo, Japan',
      'New York, USA'
    ];
    
    for (const destination of destinations) {
      console.log(`\nTesting: ${destination}`);
      try {
        const response = await mapboxService.getLocations(destination);
        
        if (response.features && response.features.length > 0) {
          const [lng, lat] = response.features[0].center;
          console.log(`✅ ${destination}: {${lat}, ${lng}}`);
          console.log(`   Full name: ${response.features[0].place_name}`);
        } else {
          console.log(`❌ No coordinates found for ${destination}`);
        }
      } catch (error) {
        console.log(`❌ Error for ${destination}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCoordinates();