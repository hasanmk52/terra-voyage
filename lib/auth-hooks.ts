"use client"

import { useSession } from "next-auth/react"

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  }
}

export function useRequireAuth() {
  const auth = useAuth()
  
  if (auth.isUnauthenticated) {
    throw new Error("Authentication required")
  }
  
  return auth
}