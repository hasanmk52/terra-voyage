const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database contents...');
    
    // Check trips
    const trips = await prisma.trip.findMany({
      include: {
        days: {
          include: {
            activities: true
          }
        },
        itineraryData: true,
        _count: {
          select: {
            activities: true,
            days: true
          }
        }
      }
    });
    
    console.log(`Found ${trips.length} trips:`);
    trips.forEach(trip => {
      console.log(`- Trip: ${trip.title} (${trip.destination})`);
      console.log(`  ID: ${trip.id}`);
      console.log(`  Public: ${trip.isPublic}`);
      console.log(`  Days: ${trip._count.days}, Activities: ${trip._count.activities}`);
      console.log(`  Has itinerary data: ${!!trip.itineraryData}`);
      console.log(`  Created: ${trip.createdAt}`);
      console.log('');
    });
    
    // Check users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- User: ${user.name} (${user.email})`);
    });
    
    // Check activities
    const activities = await prisma.activity.findMany();
    console.log(`Found ${activities.length} activities`);
    
    // Check days
    const days = await prisma.day.findMany();
    console.log(`Found ${days.length} days`);
    
    // Check itinerary data
    const itineraryData = await prisma.itineraryData.findMany();
    console.log(`Found ${itineraryData.length} itinerary data records`);
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();