import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      preferences: {
        budget: 'medium',
        interests: ['culture', 'food', 'nature'],
        accessibility: false,
      },
    },
  })

  // Create public demo user for anonymous trips
  const publicUser = await prisma.user.upsert({
    where: { email: 'public@demo.com' },
    update: {},
    create: {
      id: 'public-demo-user',
      email: 'public@demo.com',
      name: 'Public Demo',
      preferences: {},
    },
  })

  // Create sample trip
  const trip = await prisma.trip.upsert({
    where: { id: 'sample-trip-id' },
    update: {},
    create: {
      id: 'sample-trip-id',
      userId: user.id,
      title: 'Paris Adventure',
      destination: 'Paris, France',
      description: 'A wonderful trip to the City of Light',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-08-07'),
      budget: 2500.00,
      travelers: 2,
      status: 'PLANNED',
      isPublic: true, // Make public for demo/security
    },
  })

  // Create sample activities
  await prisma.activity.createMany({
    data: [
      {
        tripId: trip.id,
        name: 'Eiffel Tower Visit',
        description: 'Visit the iconic Eiffel Tower',
        location: 'Eiffel Tower',
        address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        startTime: new Date('2024-08-02T10:00:00Z'),
        endTime: new Date('2024-08-02T12:00:00Z'),
        type: 'ATTRACTION',
        price: 25.90,
        currency: 'EUR',
        order: 1,
      },
      {
        tripId: trip.id,
        name: 'Louvre Museum',
        description: 'Explore the world-famous Louvre Museum',
        location: 'Louvre Museum',
        address: 'Rue de Rivoli, 75001 Paris, France',
        coordinates: { lat: 48.8606, lng: 2.3376 },
        startTime: new Date('2024-08-03T09:00:00Z'),
        endTime: new Date('2024-08-03T17:00:00Z'),
        type: 'ATTRACTION',
        price: 17.00,
        currency: 'EUR',
        order: 2,
      },
      {
        tripId: trip.id,
        name: 'Hotel Des Arts',
        description: 'Boutique hotel in Montmartre',
        location: 'Montmartre',
        address: '5 Rue Tholozé, 75018 Paris, France',
        coordinates: { lat: 48.8841, lng: 2.3389 },
        startTime: new Date('2024-08-01T15:00:00Z'),
        endTime: new Date('2024-08-07T11:00:00Z'),
        type: 'ACCOMMODATION',
        price: 150.00,
        currency: 'EUR',
        bookingStatus: 'CONFIRMED',
        order: 0,
      },
    ],
  })

  console.log('✅ Seed completed successfully!')
  console.log(`👤 Created user: ${user.email}`)
  console.log(`🏖️  Created trip: ${trip.title}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })