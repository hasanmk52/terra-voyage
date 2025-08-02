const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCoordinates() {
  try {
    console.log('Fixing Hyderabad coordinates...');
    
    const updatedTrip = await prisma.trip.update({
      where: {
        id: 'cmdrmkvjr0003rukxomaoxn5p'
      },
      data: {
        destinationCoords: {
          lat: 17.3850,
          lng: 78.4867
        }
      }
    });
    
    console.log('Coordinates updated successfully:', updatedTrip.destinationCoords);
    
  } catch (error) {
    console.error('Error updating coordinates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCoordinates();