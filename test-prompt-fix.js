// Simple test to validate our prompt improvements
const testData = {
  destination: { destination: 'Paris, France' },
  dateRange: {
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-03')
  },
  budget: {
    amount: 1000,
    currency: 'USD',
    range: 'per-person'
  },
  travelers: {
    adults: 2,
    children: 0,
    infants: 0
  },
  interests: ['culture', 'food', 'art'],
  preferences: {
    pace: 'moderate',
    accommodationType: 'mid-range',
    transportation: 'public',
    accessibility: false,
    dietaryRestrictions: [],
    specialRequests: ''
  }
}

// Test the API endpoint
async function testItineraryGeneration() {
  try {
    const response = await fetch('http://localhost:3000/api/user/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Itinerary generation successful!')
      console.log('Generated itinerary ID:', result.tripId)
    } else {
      console.log('❌ Itinerary generation failed:')
      console.log('Error:', result.error)
      if (result.details) {
        console.log('Details:', result.details)
      }
    }
  } catch (error) {
    console.error('Network error:', error.message)
  }
}

console.log('Testing itinerary generation with updated prompts...')
testItineraryGeneration()