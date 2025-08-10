import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Get current session to log the sign-out
    const session = await getServerSession(authOptions)
    
    if (session) {
      console.log(`🚪 API: User ${session.user?.email} is signing out`)
    }
    
    // Clear any additional session data if needed
    // The NextAuth signOut function handles the main session cleanup
    
    return NextResponse.json({ 
      success: true, 
      message: "Sign out completed successfully" 
    })
  } catch (error) {
    console.error("❌ Sign out API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Sign out failed" 
    }, { status: 500 })
  }
}