#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import { serviceConfig } from '../lib/selective-mocks'

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  console.log('📊 Service Config:', {
    useRealDatabase: serviceConfig.useRealDatabase,
    databaseConfigured: !!process.env.DATABASE_URL
  })

  try {
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')

    // Test query
    const userCount = await prisma.user.count()
    const tripCount = await prisma.trip.count()
    const activityCount = await prisma.activity.count()

    console.log('📈 Database statistics:')
    console.log(`  👥 Users: ${userCount}`)
    console.log(`  🏖️  Trips: ${tripCount}`)
    console.log(`  🎯 Activities: ${activityCount}`)

    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDatabaseConnection()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })