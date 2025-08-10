"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = "/auth/signin" 
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"

  // Debug logging
  useEffect(() => {
    console.log("🔐 AuthGuard Status:", { 
      status, 
      isAuthenticated, 
      isLoading, 
      hasSession: !!session,
      userId: session?.user?.id,
      requireAuth 
    })
  }, [status, isAuthenticated, isLoading, session, requireAuth])

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      console.log("🚫 Redirecting to sign-in - not authenticated")
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to sign in...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}