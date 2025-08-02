require('dotenv').config({ path: '.env.local' })

async function testFixes() {
  try {
    const { itineraryService } = await import('./lib/itinerary-service.ts');
    const { validateAndParseItinerary } = await import('./lib/itinerary-validation.ts');
    
    const formData = {
      destination: { destination: 'Hyderabad, Telangana, India' },
      dateRange: {
        startDate: new Date('2025-08-05'),
        endDate: new Date('2025-08-07')
      },
      budget: { amount: 200, currency: 'USD', range: 'total' },
      travelers: { adults: 2, children: 0, infants: 0 },
      interests: ['culture', 'food'],
      preferences: {
        pace: 'moderate',
        accommodationType: 'mid-range',
        transportation: 'mixed',
        accessibility: false
      }
    };
    
    console.log('🧪 Testing complete itinerary generation with fixes...');
    
    // Force fallback by using short timeout
    const result = await itineraryService.generateItinerary(formData, { 
      useCache: false,
      fallbackOnTimeout: true,
      maxTimeout: 3000
    });
    
    console.log('✅ Itinerary generation successful');
    console.log('Method used:', result.metadata.generationMethod);
    console.log('Destination:', result.itinerary.itinerary.destination);
    
    // Test coordinates fix
    const firstActivity = result.itinerary.itinerary.days[0].activities[0];
    console.log('First activity coordinates:', firstActivity.location.coordinates);
    
    const hasValidCoords = firstActivity.location.coordinates.lat !== 0 || firstActivity.location.coordinates.lng !== 0;
    console.log('Map should show:', hasValidCoords ? 'Hyderabad area ✅' : 'Paris (fallback issue) ❌');
    
    // Test activity types fix
    const allTypes = result.itinerary.itinerary.days.flatMap(day => 
      day.activities.map(activity => activity.type)
    );
    console.log('Activity types found:', [...new Set(allTypes)]);
    
    // Test validation fix
    const jsonString = JSON.stringify(result.itinerary);
    const validation = validateAndParseItinerary(jsonString);
    
    if (validation.success) {
      console.log('✅ Validation passed - no more validation errors!');
    } else {
      console.log('❌ Validation still failed:');
      validation.errors?.forEach(error => console.log('  -', error));
    }
    
    console.log('\n🎉 Summary of fixes:');
    console.log('1. Mapbox location fixed:', hasValidCoords ? '✅' : '❌');
    console.log('2. Validation errors fixed:', validation.success ? '✅' : '❌');
    console.log('3. Real coordinates in fallback:', hasValidCoords ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFixes();