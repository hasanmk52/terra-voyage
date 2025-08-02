const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'demo-user-001' }
    });

    if (existingUser) {
      console.log('Demo user already exists');
      return;
    }

    // Create demo user
    const user = await prisma.user.create({
      data: {
        id: 'demo-user-001',
        email: 'demo@terravoyage.com',
        name: 'Terra Voyage Demo User',
        firstName: 'Demo',
        lastName: 'User',
        profilePicture: null,
        bio: 'Demo user for Terra Voyage trip planning',
        location: 'Demo Location',
        timeZone: 'UTC',
        language: 'en',
        isActive: true,
        isVerified: true,
      }
    });

    console.log('Demo user created:', user.id);
  } catch (error) {
    console.error('Error creating demo user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();