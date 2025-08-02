require('dotenv').config({ path: '.env.local' })

async function testItineraryGeneration() {
  try {
    const { createItineraryPrompt } = await import('./lib/prompt-templates.ts');
    const { aiService } = await import('./lib/ai-service.ts');
    const { validateAndParseItinerary } = await import('./lib/itinerary-validation.ts');

    const formData = {
      destination: { destination: "Hyderabad, Telangana, India" },
      dateRange: {
        startDate: new Date('2025-08-05'),
        endDate: new Date('2025-08-07')
      },
      budget: { amount: 200, currency: "USD", range: "total" },
      travelers: { adults: 2, children: 0, infants: 0 },
      interests: ["culture", "food"],
      preferences: {
        pace: "moderate",
        accommodationType: "mid-range",
        transportation: "mixed",
        accessibility: false
      }
    };

    console.log('🧪 Testing AI itinerary generation...');
    const promptTemplate = createItineraryPrompt(formData);
    
    console.log('📝 Generated prompt includes activity types:');
    const activityTypeMatch = promptTemplate.userPrompt.match(/"type": "([^"]+)"/);
    if (activityTypeMatch) {
      console.log('Expected types:', activityTypeMatch[1]);
    }
    
    const response = await aiService.generateCompletion(
      `${promptTemplate.systemPrompt}\n\n${promptTemplate.userPrompt}`,
      {
        model: 'gpt-4o-mini',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 30000
      }
    );
    
    console.log('🤖 AI Response length:', response.length);
    console.log('🔍 Looking for activity types in response...');
    
    // Extract activity types from response
    const typeMatches = response.match(/"type":\s*"([^"]+)"/g);
    if (typeMatches) {
      const types = typeMatches.map(match => match.match(/"type":\s*"([^"]+)"/)[1]);
      console.log('Found activity types:', [...new Set(types)]);
    }
    
    const parseResult = validateAndParseItinerary(response);
    
    if (parseResult.success) {
      console.log('✅ Validation successful!');
    } else {
      console.log('❌ Validation failed:');
      parseResult.errors?.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testItineraryGeneration()