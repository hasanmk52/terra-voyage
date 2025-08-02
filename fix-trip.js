const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTrip() {
  try {
    console.log('Making Hyderabad trip public...');
    
    const updatedTrip = await prisma.trip.update({
      where: {
        id: 'cmdrmkvjr0003rukxomaoxn5p'
      },
      data: {
        isPublic: true
      }
    });
    
    console.log('Trip updated successfully:', updatedTrip.title);
    
  } catch (error) {
    console.error('Error updating trip:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrip();