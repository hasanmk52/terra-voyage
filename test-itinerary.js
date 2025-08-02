const { createItineraryPrompt } = require('./lib/prompt-templates.ts')
const { validateAndParseItinerary } = require('./lib/itinerary-validation.ts')

// Test data
const testFormData = {
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

// Test prompt generation
try {
  const prompt = createItineraryPrompt(testFormData)
  console.log('System Prompt:')
  console.log(prompt.systemPrompt)
  console.log('\n' + '='.repeat(80) + '\n')
  console.log('User Prompt:')
  console.log(prompt.userPrompt)
  
  // Check for enum values in prompt
  const hasCorrectEnums = prompt.userPrompt.includes('walking OR public OR taxi OR rental_car') &&
                         prompt.userPrompt.includes('attraction OR restaurant OR experience') &&
                         prompt.userPrompt.includes('per_person OR per_group OR free')
  
  console.log('\n' + '='.repeat(80) + '\n')
  console.log('Enum validation check:', hasCorrectEnums ? 'PASS' : 'FAIL')
  
} catch (error) {
  console.error('Error:', error.message)
}