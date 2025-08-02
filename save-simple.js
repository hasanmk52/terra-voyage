const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function saveSimple() {
  try {
    console.log('Saving simple itinerary data...');
    
    const tripId = 'cmdrmkvjr0003rukxomaoxn5p';
    
    // Save just the itinerary data first
    await prisma.itineraryData.create({
      data: {
        tripId,
        rawData: { test: "Hyderabad itinerary data" },
        metadata: { source: 'manual_test', generatedAt: new Date() },
        generalTips: ["Visit during October to March for pleasant weather"],
        emergencyInfo: { police: "100" },
        budgetBreakdown: { total: 850 }
      }
    });

    console.log('✅ Itinerary data saved!');

    // Save one day
    const day = await prisma.day.create({
      data: {
        tripId,
        dayNumber: 1,
        date: "2025-08-01",
        theme: "Arrival and Charminar Exploration"
      }
    });

    console.log('✅ Day saved:', day.id);

    // Save one activity
    const activity = await prisma.activity.create({
      data: {
        tripId,
        dayId: day.id,
        name: "Charminar and Laad Bazaar",
        description: "Visit the iconic Charminar and explore the vibrant Laad Bazaar for bangles and traditional jewelry.",
        location: "Charminar",
        address: "Charminar Rd, Char Kaman, Hyderabad, Telangana 500002, India",
        coordinates: { "lat": 17.3607, "lng": 78.4729 },
        startTime: "11:30",
        endTime: "14:30",
        timeSlot: "afternoon",
        type: "ATTRACTION",
        price: 10,
        currency: "USD",
        priceType: "per_person",
        duration: "180 minutes",
        tips: ["Bargain respectfully while shopping at Laad Bazaar.", "Wear comfortable shoes."],
        bookingRequired: false,
        accessibility: {},
        order: 0
      }
    });

    console.log('✅ Activity saved:', activity.name);

    console.log('✅ Simple data saved successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

saveSimple();