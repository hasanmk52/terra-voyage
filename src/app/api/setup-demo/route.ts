import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('Setting up demo user...')
    
    // Check if demo user already exists
    const existingUser = await db.user.findUnique({
      where: { id: 'demo-user-001' }
    })

    if (existingUser) {
      console.log('Demo user already exists')
      return NextResponse.json({
        success: true,
        message: 'Demo user already exists',
        user: existingUser
      })
    }

    // Create demo user
    const user = await db.user.create({
      data: {
        id: 'demo-user-001',
        email: 'demo@terravoyage.com',
        name: 'Terra Voyage Demo User',
        image: null,
        emailVerified: new Date(),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        travelStyle: 'moderate',
        interests: JSON.stringify(['culture', 'food', 'adventure']),
        travelPreferences: JSON.stringify({
          pace: 'moderate',
          accommodationType: 'mid-range',
          transportation: 'public'
        }),
        preferences: {
          notifications: true,
          publicProfile: false
        }
      }
    })

    console.log('Demo user created:', user.id)
    
    return NextResponse.json({
      success: true,
      message: 'Demo user created successfully',
      user
    })
    
  } catch (error) {
    console.error('Error setting up demo user:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}