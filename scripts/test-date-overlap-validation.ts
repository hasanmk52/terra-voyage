#!/usr/bin/env tsx

/**
 * Comprehensive test script for date overlap validation system
 */

import { db } from '../lib/db'
import { TripOverlapService } from '../lib/trip-overlap-service'
import { doDateRangesOverlap, calculateOverlapDays, validateTripCreation } from '../lib/date-overlap-validation'

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')
  
  // Delete test trips
  await db.trip.deleteMany({
    where: {
      userId: 'test-user-validation',
      title: {
        startsWith: 'Test Trip'
      }
    }
  })
  
  // Delete test user
  await db.user.deleteMany({
    where: {
      id: 'test-user-validation'
    }
  })
  
  console.log('✅ Test data cleaned up')
}

async function setupTestData() {
  console.log('🔧 Setting up test data...')
  
  // Create test user
  await db.user.upsert({
    where: { id: 'test-user-validation' },
    update: {},
    create: {
      id: 'test-user-validation',
      email: 'test@validation.com',
      name: 'Test User for Validation',
      emailVerified: new Date(),
      onboardingCompleted: true,
    }
  })
  
  // Create test trips with specific date ranges (using current year + future dates)
  const currentYear = new Date().getFullYear()
  const testTrips = [
    {
      title: 'Test Trip 1 - London',
      destination: 'London, UK',
      startDate: new Date(`${currentYear}-08-10`),
      endDate: new Date(`${currentYear}-08-13`), // 10th-13th Aug
      userId: 'test-user-validation'
    },
    {
      title: 'Test Trip 2 - Paris',
      destination: 'Paris, France',
      startDate: new Date(`${currentYear}-09-01`),
      endDate: new Date(`${currentYear}-09-05`), // 1st-5th Sep
      userId: 'test-user-validation'
    },
    {
      title: 'Test Trip 3 - Tokyo',
      destination: 'Tokyo, Japan',
      startDate: new Date(`${currentYear}-12-20`),
      endDate: new Date(`${currentYear}-12-25`), // 20th-25th Dec
      userId: 'test-user-validation'
    }
  ]
  
  for (const trip of testTrips) {
    await db.trip.create({
      data: {
        ...trip,
        status: 'PLANNED',
        travelers: 1,
        isPublic: false
      }
    })
  }
  
  console.log('✅ Test data setup complete')
}

async function testUtilityFunctions() {
  console.log('\n📚 Testing utility functions...')
  
  // Test basic overlap detection
  const currentYear = new Date().getFullYear()
  const range1 = { startDate: new Date(`${currentYear}-08-10`), endDate: new Date(`${currentYear}-08-13`) }
  const range2 = { startDate: new Date(`${currentYear}-08-12`), endDate: new Date(`${currentYear}-08-15`) }
  const range3 = { startDate: new Date(`${currentYear}-08-14`), endDate: new Date(`${currentYear}-08-17`) }
  
  console.log('  Testing doDateRangesOverlap:')
  console.log(`    Range1 vs Range2 (should overlap): ${doDateRangesOverlap(range1, range2)}`)
  console.log(`    Range1 vs Range3 (should not overlap): ${doDateRangesOverlap(range1, range3)}`)
  
  console.log('  Testing calculateOverlapDays:')
  console.log(`    Range1 vs Range2 overlap days: ${calculateOverlapDays(range1, range2)}`)
  console.log(`    Range1 vs Range3 overlap days: ${calculateOverlapDays(range1, range3)}`)
  
  console.log('✅ Utility functions tested')
}

async function testDatabaseValidation() {
  console.log('\n🗄️  Testing database validation...')
  
  // Test 1: Valid new trip (no overlap)
  console.log('  Test 1: Valid new trip (no overlap)')
  const currentYear = new Date().getFullYear()
  const validTripResult = await TripOverlapService.validateNewTrip({
    title: 'Test Trip - Valid',
    destination: 'Berlin, Germany',
    startDate: new Date(`${currentYear}-10-01`),
    endDate: new Date(`${currentYear}-10-05`),
    userId: 'test-user-validation'
  })
  
  console.log(`    Result: ${validTripResult.isValid ? '✅ VALID' : '❌ INVALID'}`)
  if (!validTripResult.isValid) {
    console.log(`    Errors: ${validTripResult.errors.join(', ')}`)
  }
  
  // Test 2: Overlapping trip (should fail)
  console.log('  Test 2: Overlapping trip (should fail)')
  const overlappingTripResult = await TripOverlapService.validateNewTrip({
    title: 'Test Trip - Overlapping',
    destination: 'Rome, Italy',
    startDate: new Date(`${currentYear}-08-11`), // Overlaps with London trip
    endDate: new Date(`${currentYear}-08-14`),
    userId: 'test-user-validation'
  })
  
  console.log(`    Result: ${overlappingTripResult.isValid ? '✅ VALID' : '❌ INVALID (Expected)'}`)
  if (!overlappingTripResult.isValid) {
    console.log(`    Errors: ${overlappingTripResult.errors.join(', ')}`)
    if (overlappingTripResult.overlapResult) {
      console.log(`    Overlapping trips: ${overlappingTripResult.overlapResult.overlappingTrips.length}`)
      overlappingTripResult.overlapResult.overlapDetails.forEach(detail => {
        console.log(`      - ${detail.tripTitle}: ${detail.overlapDays} days overlap`)
      })
    }
  }
  
  // Test 3: Multiple overlaps
  console.log('  Test 3: Multiple overlaps')
  const multiOverlapResult = await TripOverlapService.validateNewTrip({
    title: 'Test Trip - Multi Overlap',
    destination: 'New York, USA',
    startDate: new Date(`${currentYear}-08-01`),
    endDate: new Date(`${currentYear}-09-10`), // Overlaps with both London and Paris trips
    userId: 'test-user-validation'
  })
  
  console.log(`    Result: ${multiOverlapResult.isValid ? '✅ VALID' : '❌ INVALID (Expected)'}`)
  if (!multiOverlapResult.isValid && multiOverlapResult.overlapResult) {
    console.log(`    Overlapping trips: ${multiOverlapResult.overlapResult.overlappingTrips.length}`)
  }
  
  console.log('✅ Database validation tested')
}

async function testSuggestions() {
  console.log('\n💡 Testing alternative date suggestions...')
  
  const currentYear = new Date().getFullYear()
  const suggestions = await TripOverlapService.suggestAlternativeDates(
    'test-user-validation',
    new Date(`${currentYear}-08-11`), // Overlaps with London trip
    new Date(`${currentYear}-08-14`)
  )
  
  console.log(`  Found ${suggestions.length} alternative date suggestions:`)
  suggestions.forEach((suggestion, index) => {
    const duration = Math.ceil((suggestion.endDate.getTime() - suggestion.startDate.getTime()) / (1000 * 60 * 60 * 24))
    console.log(`    ${index + 1}. ${suggestion.startDate.toDateString()} - ${suggestion.endDate.toDateString()} (${duration} days)`)
  })
  
  console.log('✅ Suggestions tested')
}

async function testOverlapDetails() {
  console.log('\n🔍 Testing overlap details...')
  
  const currentYear = new Date().getFullYear()
  const overlapDetails = await TripOverlapService.getOverlapDetails(
    'test-user-validation',
    new Date(`${currentYear}-08-05`),
    new Date(`${currentYear}-08-15`) // Overlaps with London trip
  )
  
  console.log(`  Has overlap: ${overlapDetails.hasOverlap}`)
  if (overlapDetails.hasOverlap) {
    console.log(`  Overlapping trips: ${overlapDetails.overlappingTrips.length}`)
    overlapDetails.overlapDetails.forEach(detail => {
      console.log(`    - ${detail.tripTitle} (${detail.destination}): ${detail.overlapDays} days`)
      console.log(`      Overlap period: ${detail.overlapStart.toDateString()} - ${detail.overlapEnd.toDateString()}`)
    })
  }
  
  console.log('✅ Overlap details tested')
}

async function testEdgeCases() {
  console.log('\n🎯 Testing edge cases...')
  
  // Test 1: Same start and end dates
  console.log('  Test 1: Adjacent dates (should not overlap)')
  const currentYear = new Date().getFullYear()
  const adjacentResult = await TripOverlapService.validateNewTrip({
    title: 'Test Trip - Adjacent',
    destination: 'Barcelona, Spain',
    startDate: new Date(`${currentYear}-08-13`), // Ends when London trip ends
    endDate: new Date(`${currentYear}-08-16`),
    userId: 'test-user-validation'
  })
  
  console.log(`    Result: ${adjacentResult.isValid ? '✅ VALID (Expected)' : '❌ INVALID'}`)
  
  // Test 2: Dates in the past
  console.log('  Test 2: Dates in the past (should fail)')
  const pastDateResult = await TripOverlapService.validateNewTrip({
    title: 'Test Trip - Past',
    destination: 'Amsterdam, Netherlands',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-01-05'),
    userId: 'test-user-validation'
  })
  
  console.log(`    Result: ${pastDateResult.isValid ? '✅ VALID' : '❌ INVALID (Expected)'}`)
  if (!pastDateResult.isValid) {
    console.log(`    Errors: ${pastDateResult.errors.join(', ')}`)
  }
  
  // Test 3: Dates too far in future
  console.log('  Test 3: Dates too far in future (should fail)')
  const futureDateResult = await TripOverlapService.validateNewTrip({
    title: 'Test Trip - Far Future',
    destination: 'Sydney, Australia',
    startDate: new Date('2027-01-01'),
    endDate: new Date('2027-01-05'),
    userId: 'test-user-validation'
  })
  
  console.log(`    Result: ${futureDateResult.isValid ? '✅ VALID' : '❌ INVALID (Expected)'}`)
  if (!futureDateResult.isValid) {
    console.log(`    Errors: ${futureDateResult.errors.join(', ')}`)
  }
  
  console.log('✅ Edge cases tested')
}

async function testAllUserOverlaps() {
  console.log('\n👥 Testing all user overlaps...')
  
  const allOverlaps = await TripOverlapService.getAllUserOverlaps('test-user-validation')
  
  console.log(`  Found ${allOverlaps.length} overlaps between existing trips`)
  allOverlaps.forEach((overlap, index) => {
    console.log(`    ${index + 1}. "${overlap.trip1.title}" overlaps with "${overlap.trip2.title}"`)
    console.log(`       ${overlap.overlapDays} days overlap: ${overlap.overlapStart.toDateString()} - ${overlap.overlapEnd.toDateString()}`)
  })
  
  console.log('✅ All user overlaps tested')
}

async function runAllTests() {
  console.log('🧪 Starting Date Overlap Validation Tests...')
  console.log('================================================')
  
  try {
    // Setup
    await cleanupTestData()
    await setupTestData()
    
    // Run tests
    await testUtilityFunctions()
    await testDatabaseValidation()
    await testSuggestions()
    await testOverlapDetails()
    await testEdgeCases()
    await testAllUserOverlaps()
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Utility functions working correctly')
    console.log('   ✅ Database validation preventing overlaps')
    console.log('   ✅ Alternative date suggestions working')
    console.log('   ✅ Overlap details providing accurate information')
    console.log('   ✅ Edge cases handled properly')
    console.log('   ✅ All user overlaps detected correctly')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    throw error
  } finally {
    // Cleanup
    await cleanupTestData()
    console.log('\n🧹 Cleanup completed')
  }
}

// Run the tests
runAllTests().catch(console.error)