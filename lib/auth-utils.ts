import { NextRequest } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

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