import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateCompleteOnboarding } from '@/lib/onboarding-validation'

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
    
    // Validate the onboarding data
    const validation = validateCompleteOnboarding(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid onboarding data',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { travelStyle, interests, preferences } = validation.data

    // Update user with onboarding data
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
        travelStyle: JSON.stringify(travelStyle),
        interests: JSON.stringify(interests), 
        travelPreferences: JSON.stringify(preferences),
        onboardingCompletedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        onboardingCompleted: updatedUser.onboardingCompleted,
        onboardingCompletedAt: updatedUser.onboardingCompletedAt
      }
    })

  } catch (error) {
    console.error('Onboarding API error:', error)
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
        onboardingCompleted: true,
        onboardingCompletedAt: true,
        travelStyle: true,
        interests: true,
        travelPreferences: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    const parsedData = {
      id: user.id,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
      travelStyle: null,
      interests: null,
      preferences: null,
    }

    try {
      if (user.travelStyle) {
        parsedData.travelStyle = JSON.parse(user.travelStyle)
      }
      if (user.interests) {
        parsedData.interests = JSON.parse(user.interests)
      }
      if (user.travelPreferences) {
        parsedData.preferences = JSON.parse(user.travelPreferences)
      }
    } catch (parseError) {
      console.error('Error parsing user data:', parseError)
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    })

  } catch (error) {
    console.error('Get onboarding API error:', error)
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

    if (!field || !data) {
      return NextResponse.json(
        { error: 'Field and data are required' },
        { status: 400 }
      )
    }

    const allowedFields = ['travelStyle', 'interests', 'travelPreferences']
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: 'Invalid field' },
        { status: 400 }
      )
    }

    // Update specific field
    const updateData: any = {}
    updateData[field] = JSON.stringify(data)

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        [field]: data
      }
    })

  } catch (error) {
    console.error('Update onboarding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}