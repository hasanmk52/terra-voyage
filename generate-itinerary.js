const { PrismaClient } = require('@prisma/client');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Verify required environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required in .env.local');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required in .env.local');
  process.exit(1);
}

// Set USE_MOCKS to false for this script
process.env.USE_MOCKS = "false";

const prisma = new PrismaClient();

// Helper function to map AI activity types to database enum
function mapActivityType(aiType) {
  const typeMapping = {
    'attraction': 'ATTRACTION',
    'restaurant': 'RESTAURANT', 
    'experience': 'EXPERIENCE',
    'transportation': 'TRANSPORTATION',
    'accommodation': 'ACCOMMODATION',
    'museum': 'ATTRACTION', // Museums are attractions
    'shopping': 'SHOPPING',
    'dining': 'RESTAURANT',
    'sightseeing': 'ATTRACTION',
    'leisure': 'EXPERIENCE',
    'other': 'OTHER'
  };
  
  return typeMapping[aiType?.toLowerCase()] || 'OTHER';
}

async function generateItinerary() {
  try {
    console.log('Generating itinerary for Hyderabad trip...');
    
    const tripId = 'cmdrmkvjr0003rukxomaoxn5p';
    
    // Get trip data
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });
    
    if (!trip) {
      console.error('Trip not found');
      return;
    }
    
    console.log('Found trip:', trip.title);
    
    // Prepare form data for itinerary service
    const validatedData = {
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      budget: trip.budget,
      travelers: trip.travelers,
      interests: ['culture', 'food', 'sightseeing'],
      accommodationType: 'hotel'
    };
    
    const destinationCoords = trip.destinationCoords || { lat: 17.3850, lng: 78.4867 }; // Hyderabad coords
    
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);
    
    // Create form data for itinerary service
    const formData = {
      destination: {
        destination: validatedData.destination,
        coordinates: destinationCoords
      },
      dateRange: {
        startDate,
        endDate
      },
      budget: {
        amount: validatedData.budget || 2000,
        currency: 'USD',
        range: 'total'
      },
      interests: validatedData.interests || ['culture', 'food'],
      preferences: {
        accommodationType: validatedData.accommodationType || 'hotel',
        transportation: 'public'
      },
      travelers: {
        adults: validatedData.travelers,
        children: 0,
        infants: 0
      }
    };
    
    console.log('Form data prepared:', JSON.stringify(formData, null, 2));
    
    // Import and use itinerary service
    const { itineraryService } = require('./lib/itinerary-service.ts');
    
    console.log('Calling AI service...');
    const itineraryResult = await itineraryService.generateItinerary(formData, {
      prioritizeSpeed: false,
      useCache: true,
      fallbackOnTimeout: false
    });
    
    console.log('AI service response received');
    console.log('Itinerary result keys:', Object.keys(itineraryResult));
    
    if (itineraryResult.itinerary?.itinerary?.days) {
      console.log('Days found:', itineraryResult.itinerary.itinerary.days.length);
    }
    
    // Save itinerary data to database
    await prisma.$transaction(async (tx) => {
      console.log('Starting database transaction...');
      
      // Save complete itinerary data
      await tx.itineraryData.create({
        data: {
          tripId,
          rawData: itineraryResult.itinerary,
          metadata: itineraryResult.metadata || {},
          generalTips: itineraryResult.itinerary?.itinerary?.generalTips || [],
          emergencyInfo: itineraryResult.itinerary?.itinerary?.emergencyInfo || {},
          budgetBreakdown: itineraryResult.itinerary?.itinerary?.totalBudgetEstimate?.breakdown || {}
        }
      });
      
      console.log('Itinerary data saved');
      
      // Save days and activities if they exist
      if (itineraryResult.itinerary?.itinerary?.days) {
        for (const dayData of itineraryResult.itinerary.itinerary.days) {
          try {
            console.log(`Processing day ${dayData.day}...`);
            
            const day = await tx.day.create({
              data: {
                tripId,
                dayNumber: dayData.day || 1,
                date: dayData.date || new Date().toISOString().split('T')[0],
                theme: dayData.theme || 'Day activities',
                dailyBudget: dayData.dailyBudget || null,
                transportation: dayData.transportation || null
              }
            });
            
            console.log(`Day ${dayData.day} saved with ID: ${day.id}`);
            
            // Save activities for this day
            if (dayData.activities && Array.isArray(dayData.activities)) {
              for (const [index, activityData] of dayData.activities.entries()) {
                try {
                  const activity = await tx.activity.create({
                    data: {
                      tripId,
                      dayId: day.id,
                      name: activityData.name || 'Unnamed Activity',
                      description: activityData.description || '',
                      location: activityData.location?.name || '',
                      address: activityData.location?.address || '',
                      coordinates: activityData.location?.coordinates || null,
                      startTime: activityData.startTime || '',
                      endTime: activityData.endTime || '',
                      timeSlot: activityData.timeSlot || 'morning',
                      type: mapActivityType(activityData.type || 'other'),
                      price: activityData.pricing?.amount || null,
                      currency: activityData.pricing?.currency || 'USD',
                      priceType: activityData.pricing?.priceType || 'per_person',
                      duration: activityData.duration || '',
                      tips: Array.isArray(activityData.tips) ? activityData.tips : [],
                      bookingRequired: Boolean(activityData.bookingRequired),
                      accessibility: activityData.accessibility || {},
                      order: index
                    }
                  });
                  
                  console.log(`Activity ${index + 1} saved: ${activity.name}`);
                } catch (activityError) {
                  console.error(`Error saving activity ${index} for day ${dayData.day}:`, activityError);
                }
              }
            }
          } catch (dayError) {
            console.error(`Error saving day ${dayData.day}:`, dayError);
          }
        }
      }
      
      console.log('Transaction completed successfully');
    });
    
    console.log('✅ Itinerary generated and saved successfully!');
    
  } catch (error) {
    console.error('❌ Error generating itinerary:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}

generateItinerary();