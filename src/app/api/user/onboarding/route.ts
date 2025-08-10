import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Comprehensive onboarding schema matching the frontend form
const onboardingSchema = z.object({
  // Personal Information
  displayName: z.string().min(2, "Name must be at least 2 characters").max(50),
  location: z.string().optional(),
  bio: z.string().max(500).optional(),
  
  // Travel Style & Preferences
  travelStyle: z.enum(["adventure", "luxury", "budget", "cultural", "relaxation", "mixed"]),
  pace: z.enum(["slow", "moderate", "fast"]),
  accommodationType: z.array(z.string()).min(1, "Select at least one accommodation type"),
  transportPreferences: z.array(z.string()).min(1, "Select at least one transport preference"),
  
  // Interests
  interests: z.array(z.string()).min(3, "Select at least 3 interests"),
  
  // Dietary & Accessibility
  dietaryRestrictions: z.array(z.string()),
  accessibility: z.enum(["full", "limited", "wheelchair", "none"]),
  
  // Preferences
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"]),
  measurementUnit: z.enum(["metric", "imperial"]),
  language: z.enum(["en", "es", "fr", "de", "it", "pt"]),
  
  // Privacy
  profilePublic: z.boolean(),
  allowMarketing: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate the onboarding data with comprehensive schema
    const validation = onboardingSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid onboarding data',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Update user with comprehensive onboarding data
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: data.displayName,
        onboardingCompleted: true,
        travelStyle: data.travelStyle,
        interests: JSON.stringify(data.interests),
        travelPreferences: JSON.stringify({
          pace: data.pace,
          accommodationType: data.accommodationType,
          transportPreferences: data.transportPreferences,
          dietaryRestrictions: data.dietaryRestrictions,
          accessibility: data.accessibility,
        }),
        preferences: {
          currency: data.currency,
          measurementUnit: data.measurementUnit,
          language: data.language,
          theme: "light",
          notifications: {
            email: true,
            push: false,
            marketing: data.allowMarketing,
            tripReminders: true,
            activityUpdates: true,
          },
          privacy: {
            profilePublic: data.profilePublic,
            tripsPublic: false,
            shareAnalytics: true,
          },
          travel: {
            preferredTransport: data.transportPreferences,
            accommodationType: data.accommodationType,
            dietaryRestrictions: data.dietaryRestrictions,
            mobility: data.accessibility,
          }
        },
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      }
    })

    console.log(`✅ Comprehensive onboarding completed for user: ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        onboardingCompleted: updatedUser.onboardingCompleted,
        travelStyle: updatedUser.travelStyle,
        interests: updatedUser.interests,
        onboardingCompletedAt: updatedUser.onboardingCompletedAt
      }
    })

  } catch (error) {
    console.error('❌ Comprehensive onboarding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        onboardingCompleted: true,
        onboardingCompletedAt: true,
        travelStyle: true,
        interests: true,
        travelPreferences: true,
        preferences: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
        onboardingCompletedAt: user.onboardingCompletedAt,
        travelStyle: user.travelStyle,
        interests: user.interests,
        travelPreferences: user.travelPreferences,
        preferences: user.preferences,
      }
    })

  } catch (error) {
    console.error('❌ Get onboarding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { field, data } = body

    if (!field || data === undefined) {
      return NextResponse.json(
        { error: 'Field and data are required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'name', 'location', 'bio', 'travelStyle', 'interests', 
      'travelPreferences', 'preferences'
    ]
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: 'Invalid field' },
        { status: 400 }
      )
    }

    // Update specific field
    const updateData: any = { updatedAt: new Date() }
    updateData[field] = data

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    console.log(`✅ User profile field updated: ${field} for ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        [field]: data
      }
    })

  } catch (error) {
    console.error('❌ Update onboarding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}