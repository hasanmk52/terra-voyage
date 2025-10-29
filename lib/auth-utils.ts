import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

// Session validation (server-side only - not compatible with Edge Runtime)
export async function validateSession(request?: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", status: 401 }
    }

    return { success: true, userId: session.user.id, session }
  } catch (error) {
    console.error("Session validation error:", error)
    return { success: false, error: "Session validation failed", status: 500 }
  }
}

// Check if user has admin role
export async function validateAdminSession() {
  const result = await validateSession()
  if (!result.success) {
    return result
  }

  // Check if user has admin role
  const userRole = result.session?.user?.role
  if (userRole !== 'ADMIN') {
    return { success: false, error: "Admin access required", status: 403 }
  }

  return result
}

/**
 * Server-side authentication utility
 * Use this in Server Components and API routes
 */
export async function getServerAuth() {
  const session = await getServerSession(authOptions)
  return {
    session,
    user: session?.user || null,
    isAuthenticated: !!session?.user,
  }
}

/**
 * Server-side authentication requirement
 * Redirects to sign-in if not authenticated
 */
export async function requireServerAuth() {
  const { session } = await getServerAuth()
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  return session
}

/**
 * Get user with additional profile data
 */
export async function getUserProfile(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        onboardingCompleted: true,
        preferences: true,
        travelStyle: true,
        interests: true,
        travelPreferences: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    
    return user
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    return null
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, data: {
  name?: string
  preferences?: any
  travelStyle?: string
  interests?: string
  travelPreferences?: string
  onboardingCompleted?: boolean
}) {
  try {
    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        onboardingCompleted: true,
        preferences: true,
      }
    })
    
    return user
  } catch (error) {
    console.error("Failed to update user profile:", error)
    throw new Error("Failed to update profile")
  }
}

/**
 * Check if user has completed onboarding
 */
export async function checkOnboardingStatus(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompleted: true,
        travelStyle: true,
        interests: true,
      }
    })
    
    return {
      completed: user?.onboardingCompleted || false,
      hasBasicInfo: !!(user?.travelStyle && user?.interests),
    }
  } catch (error) {
    console.error("Failed to check onboarding status:", error)
    return { completed: false, hasBasicInfo: false }
  }
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(userId: string) {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      }
    })
    
    return true
  } catch (error) {
    console.error("Failed to complete onboarding:", error)
    return false
  }
}

/**
 * Create user preferences with defaults
 */
export function createDefaultPreferences() {
  return {
    theme: "light",
    currency: "USD",
    measurementUnit: "metric",
    language: "en",
    notifications: {
      email: true,
      push: false,
      marketing: false,
      tripReminders: true,
      activityUpdates: true,
    },
    privacy: {
      profilePublic: false,
      tripsPublic: false,
      shareAnalytics: true,
    },
    travel: {
      preferredTransport: ["flight", "car"],
      accommodationType: ["hotel", "airbnb"],
      dietaryRestrictions: [],
      mobility: "full",
    }
  }
}

/**
 * Validate user permissions for trip access
 */
export async function validateTripAccess(tripId: string, userId: string) {
  try {
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        userId: true,
        isPublic: true
      }
    })
    
    if (!trip) {
      return { hasAccess: false, role: null }
    }
    
    // If user is owner
    if (trip.userId === userId) {
      return { hasAccess: true, role: "OWNER" }
    }
    
    // Allow read-only access to public trips
    if (trip.isPublic) {
      return { hasAccess: true, role: "VIEWER" }
    }
    
  } catch (error) {
    console.error("Failed to validate trip access:", error)
  }

  return { hasAccess: false, role: null }
}

/**
 * Get user's trips with filtering options
 */
export async function getUserTrips(userId: string, options?: {
  status?: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  limit?: number
  offset?: number
}) {
  try {
    const trips = await db.trip.findMany({
      where: {
        userId: userId,
        ...(options?.status && { status: options.status })
      },
      include: {
        activities: {
          take: 3, // Just get a few activities for preview
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            activities: true,
            days: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    })
    
    return trips
  } catch (error) {
    console.error("Failed to fetch user trips:", error)
    return []
  }
}
