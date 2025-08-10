import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      onboardingCompleted?: boolean
      preferences?: any | null
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    emailVerified?: Date | null
    onboardingCompleted?: boolean
    preferences?: any | null
    travelStyle?: string | null
    interests?: string | null
    travelPreferences?: string | null
    createdAt?: Date
    updatedAt?: Date
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    onboardingCompleted?: boolean
    preferences?: any | null
  }
}