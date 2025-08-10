"use client"

import { SessionProvider } from "next-auth/react"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Refetch session every 5 minutes
      refetchInterval={5 * 60}
      // Refetch session when window gains focus
      refetchOnWindowFocus={true}
      // Custom base path if needed
      basePath="/api/auth"
    >
      {children}
    </SessionProvider>
  )
}