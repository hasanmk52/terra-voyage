const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The successful itinerary data from our AI test
const itineraryData = {
  "itinerary": {
    "destination": "Hyderabad, Telangana, India",
    "days": [
      {
        "day": 1,
        "date": "2025-08-01",
        "theme": "Arrival and Charminar Exploration",
        "activities": [
          {
            "name": "Arrival at Rajiv Gandhi International Airport (HYD)",
            "description": "Arrive at Hyderabad airport, take a pre-booked taxi or airport transfer to your hotel in the old city.",
            "location": {
              "name": "Rajiv Gandhi International Airport",
              "address": "Shamshabad, Hyderabad, Telangana 500409, India",
              "coordinates": { "lat": 17.2293, "lng": 78.2827 }
            },
            "startTime": "09:00",
            "endTime": "10:30",
            "timeSlot": "morning",
            "type": "transportation",
            "pricing": {
              "amount": 20,
              "currency": "USD",
              "priceType": "per_trip"
            },
            "duration": "90 minutes",
            "tips": ["Confirm your transfer in advance.", "Negotiate taxi fares before starting your journey."],
            "bookingRequired": true,
            "accessibility": {}
          },
          {
            "name": "Check in to Hotel",
            "description": "Check in to your pre-booked hotel near Charminar.",
            "location": {
              "name": "Hotel (Example: Hotel Shadab)",
              "address": "Address of your chosen hotel",
              "coordinates": { "lat": 17.3606, "lng": 78.4740 }
            },
            "startTime": "10:30",
            "endTime": "11:30",
            "timeSlot": "morning",
            "type": "accommodation",
            "pricing": {
              "amount": 75,
              "currency": "USD",
              "priceType": "per_night_per_person"
            },
            "duration": "60 minutes",
            "tips": ["Confirm booking and check-in details before arrival."],
            "bookingRequired": true,
            "accessibility": {}
          },
          {
            "name": "Charminar and Laad Bazaar",
            "description": "Visit the iconic Charminar and explore the vibrant Laad Bazaar for bangles and traditional jewelry.",
            "location": {
              "name": "Charminar",
              "address": "Charminar Rd, Char Kaman, Hyderabad, Telangana 500002, India",
              "coordinates": { "lat": 17.3607, "lng": 78.4729 }
            },
            "startTime": "11:30",
            "endTime": "14:30",
            "timeSlot": "afternoon",
            "type": "attraction",
            "pricing": {
              "amount": 10,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "180 minutes",
            "tips": ["Bargain respectfully while shopping at Laad Bazaar.", "Wear comfortable shoes."],
            "bookingRequired": false,
            "accessibility": {}
          },
          {
            "name": "Lunch at Paradise Restaurant",
            "description": "Enjoy a delicious Hyderabadi Biryani lunch at the famous Paradise Restaurant.",
            "location": {
              "name": "Paradise Restaurant (multiple locations)",
              "address": "Check for nearest location",
              "coordinates": { "lat": 17.3720, "lng": 78.4775 }
            },
            "startTime": "14:30",
            "endTime": "15:30",
            "timeSlot": "afternoon",
            "type": "restaurant",
            "pricing": {
              "amount": 20,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "60 minutes",
            "tips": ["Try their signature Hyderabadi Biryani."],
            "bookingRequired": false,
            "accessibility": {}
          }
        ]
      },
      {
        "day":2,
        "date": "2025-08-02",
        "theme": "Forts and Palaces",
        "activities":[
          {
            "name": "Golconda Fort",
            "description": "Explore the magnificent Golconda Fort, known for its acoustics and history.",
            "location":{
              "name": "Golconda Fort",
              "address": "Hyderabad, Telangana 500008, India",
              "coordinates": {"lat": 17.3950, "lng": 78.2640}
            },
            "startTime": "09:00",
            "endTime": "12:00",
            "timeSlot": "morning",
            "type": "attraction",
            "pricing": {
              "amount": 10,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "180 minutes",
            "tips": ["Wear comfortable shoes as there's a lot of walking involved.", "Hire a guide for a more informative experience."],
            "bookingRequired": false,
            "accessibility": {}
          },
          {
            "name": "Lunch at a local restaurant near Golconda",
            "description": "Enjoy lunch at a local restaurant near Golconda Fort.",
            "location": {
              "name": "Local Restaurant",
              "address": "Near Golconda Fort",
              "coordinates": { "lat": 17.3950, "lng": 78.2640 }
            },
            "startTime": "12:00",
            "endTime": "13:00",
            "timeSlot": "afternoon",
            "type": "restaurant",
            "pricing": {
              "amount": 15,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "60 minutes",
            "tips": ["Try some local Telangana cuisine."],
            "bookingRequired": false,
            "accessibility": {}
          },
          {
            "name": "Chowmahalla Palace",
            "description": "Visit the Chowmahalla Palace, the former residence of the Nizams.",
            "location": {
              "name": "Chowmahalla Palace",
              "address": "Motigalli, Khilwat, Hyderabad, Telangana 500002, India",
              "coordinates": { "lat": 17.3667, "lng": 78.4778 }
            },
            "startTime": "13:30",
            "endTime": "16:30",
            "timeSlot": "afternoon",
            "type": "attraction",
            "pricing": {
              "amount": 15,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "180 minutes",
            "tips": ["Take your time to explore the various courtyards and halls."],
            "bookingRequired": false,
            "accessibility": {}
          }
        ]
      },
      {
        "day": 3,
        "date": "2025-08-03",
        "theme": "Museums and Gardens",
        "activities": [
          {
            "name": "Salar Jung Museum",
            "description": "Explore the Salar Jung Museum, housing a vast collection of artifacts from around the world.",
            "location": {
              "name": "Salar Jung Museum",
              "address": "Darulshifa, Afzal Gunj, Hyderabad, Telangana 500002, India",
              "coordinates": { "lat": 17.3614, "lng": 78.4781 }
            },
            "startTime": "09:00",
            "endTime": "12:00",
            "timeSlot": "morning",
            "type": "attraction",
            "pricing": {
              "amount": 10,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "180 minutes",
            "tips": ["Allow ample time to explore the museum's diverse collections."],
            "bookingRequired": false,
            "accessibility": {}
          },
          {
            "name": "Lunch at a local restaurant",
            "description": "Have lunch at a local restaurant near the museum.",
            "location": {
              "name": "Local Restaurant",
              "address": "Near Salar Jung Museum",
              "coordinates": { "lat": 17.3614, "lng": 78.4781 }
            },
            "startTime": "12:00",
            "endTime": "13:00",
            "timeSlot": "afternoon",
            "type": "restaurant",
            "pricing": {
              "amount": 15,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "60 minutes",
            "tips": ["Try different local dishes."],
            "bookingRequired": false,
            "accessibility": {}
          },
          {
            "name": "Lumbini Park and Hussain Sagar Lake",
            "description": "Enjoy a relaxing evening at Lumbini Park and take a boat ride on Hussain Sagar Lake.",
            "location": {
              "name": "Lumbini Park",
              "address": "Tank Bund Rd, Hussain Sagar Lake, Hyderabad, Telangana 500001, India",
              "coordinates": { "lat": 17.3784, "lng": 78.4765 }
            },
            "startTime": "16:00",
            "endTime": "19:00",
            "timeSlot": "evening",
            "type": "attraction",
            "pricing": {
              "amount": 5,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "180 minutes",
            "tips": ["Enjoy the laser show in the evening (check timings)."],
            "bookingRequired": false,
            "accessibility": {}
          }
        ]
      },
      {
        "day": 4,
        "date": "2025-08-04",
        "theme": "Ramoji Film City (Optional)",
        "activities": [
          {
            "name": "Ramoji Film City",
            "description": "Spend the day at Ramoji Film City, one of the world's largest integrated film studios (Optional, consider time and budget).",
            "location": {
              "name": "Ramoji Film City",
              "address": "Telangana State Highway 9, Hayathnagar, Hyderabad, Telangana 501509, India",
              "coordinates": { "lat": 17.3048, "lng": 78.5100 }
            },
            "startTime": "09:00",
            "endTime": "18:00",
            "timeSlot": "full_day",
            "type": "attraction",
            "pricing": {
              "amount": 50,
              "currency": "USD",
              "priceType": "per_person"
            },
            "duration": "540 minutes",
            "tips": ["Book tickets online in advance.", "Wear comfortable shoes and clothing."],
            "bookingRequired": true,
            "accessibility": {}
          }
        ]
      },
      {
        "day": 5,
        "date": "2025-08-05",
        "theme": "Departure",
        "activities": [
          {
            "name": "Departure from Hyderabad",
            "description": "Check out from your hotel and transfer to Rajiv Gandhi International Airport for your departure.",
            "location": {
              "name": "Rajiv Gandhi International Airport",
              "address": "Shamshabad, Hyderabad, Telangana 500409, India",
              "coordinates": { "lat": 17.2293, "lng": 78.2827 }
            },
            "startTime": "10:00",
            "endTime": "13:00",
            "timeSlot": "morning",
            "type": "transportation",
            "pricing": {
              "amount": 20,
              "currency": "USD",
              "priceType": "per_trip"
            },
            "duration": "180 minutes",
            "tips": ["Allow sufficient time for check-in and security."],
            "bookingRequired": true,
            "accessibility": {}
          }
        ]
      }
    ]
  }
};

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
    'other': 'OTHER',
    'food': 'RESTAURANT',
    'travel': 'TRANSPORTATION',
    'lodging': 'ACCOMMODATION',
    'park': 'ATTRACTION'
  };
  
  return typeMapping[aiType?.toLowerCase()] || 'OTHER';
}

async function saveItinerary() {
  try {
    console.log('Saving Hyderabad itinerary to database...');
    
    const tripId = 'cmdrmkvjr0003rukxomaoxn5p';
    
    // Save itinerary data to database
    await prisma.$transaction(async (tx) => {
      console.log('Starting database transaction...');

      // Delete existing itinerary data if any
      await tx.itineraryData.deleteMany({
        where: { tripId }
      });

      await tx.activity.deleteMany({
        where: { tripId }
      });

      await tx.day.deleteMany({
        where: { tripId }
      });

      // Save complete itinerary data
      await tx.itineraryData.create({
        data: {
          tripId,
          rawData: itineraryData,
          metadata: { source: 'manual_gemini_test', generatedAt: new Date() },
          generalTips: ["Visit during October to March for pleasant weather", "Try local street food", "Bargain while shopping"],
          emergencyInfo: { police: "100", ambulance: "102", fire: "101" },
          budgetBreakdown: { accommodation: 300, food: 200, activities: 150, transport: 100, shopping: 100 }
        }
      });

      console.log('Itinerary data saved');

      // Save days and activities
      if (itineraryData.itinerary?.days) {
        for (const dayData of itineraryData.itinerary.days) {
          try {
            console.log(`Processing day ${dayData.day}...`);

            const day = await tx.day.create({
              data: {
                tripId,
                dayNumber: dayData.day || 1,
                date: dayData.date || new Date().toISOString().split('T')[0],
                theme: dayData.theme || 'Day activities',
                dailyBudget: null,
                transportation: null
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

    console.log('✅ Hyderabad itinerary saved successfully!');

  } catch (error) {
    console.error('❌ Error saving itinerary:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}

saveItinerary();