import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { Adapter } from "next-auth/adapters"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup", 
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  debug: process.env.NODE_ENV === "development",
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      // Only log in development mode for security
      if (process.env.NODE_ENV === "development") {
        console.log('🔄 JWT callback triggered:', { 
          hasToken: !!token, 
          hasUser: !!user, 
          hasAccount: !!account,
          tokenSub: token?.sub
        });
      }
      
      // Persist the OAuth account in the token right after signin
      if (account && user) {
        if (process.env.NODE_ENV === "development") {
          console.log('✅ Storing user info in JWT token');
        }
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (process.env.NODE_ENV === "development") {
        console.log('🔄 Session callback triggered:', { 
          hasSession: !!session, 
          hasToken: !!token,
          tokenSub: token?.sub,
          strategy: 'jwt'
        });
      }
      
      try {
        // Send properties to the client
        if (token && session.user) {
          session.user.id = token.id as string
          session.user.email = token.email as string
          session.user.name = token.name as string
          session.user.image = token.picture as string
          
          // Try to get additional user data from database
          try {
            const dbUser = await db.user.findUnique({
              where: { id: token.id as string }
            });
            
            if (dbUser) {
              session.user.onboardingCompleted = dbUser.onboardingCompleted || false
              session.user.preferences = dbUser.preferences || null
              session.user.travelStyle = dbUser.travelStyle || null
              session.user.interests = dbUser.interests || null
              session.user.travelPreferences = dbUser.travelPreferences || null
            }
          } catch (dbError) {
            console.warn('⚠️ Could not fetch additional user data from database:', dbError);
          }
        }
        
        if (process.env.NODE_ENV === "development") {
          console.log('✅ Session callback successful');
        }
        return session
      } catch (error) {
        console.error('❌ Session callback error:', error);
        return session
      }
    },
    async signIn({ user, account, profile }) {
      if (process.env.NODE_ENV === "development") {
        console.log('🔐 SignIn callback triggered:', {
          provider: account?.provider,
          hasProfile: !!profile
        });
      }
      
      if (account?.provider === "google" && profile) {
        if (process.env.NODE_ENV === "development") {
          console.log('✅ Google OAuth sign-in successful');
        }
        return true;
      }
      
      return true
    },
    async redirect({ url, baseUrl }) {
      if (process.env.NODE_ENV === "development") {
        console.log('🔄 Redirect callback triggered:', { url, baseUrl });
      }
      
      // Redirect to onboarding for new users, or trips for existing users
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      
      // Default redirect based on onboarding status
      const finalUrl = `${baseUrl}/trips`;
      if (process.env.NODE_ENV === "development") {
        console.log('🎯 Final redirect URL:', finalUrl);
      }
      return finalUrl;
    },
  },
  events: {
    async createUser({ user }) {
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ New user created`);
      }
      
      // Initialize user with default preferences and settings
      try {
        await db.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
            onboardingCompleted: false,
            preferences: {
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
        })
        if (process.env.NODE_ENV === "development") {
          console.log(`✅ User profile initialized`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize user profile`, error)
        // Don't throw the error - just log it to prevent sign-in failure
      }
    },
    async signIn({ user, isNewUser }) {
      if (process.env.NODE_ENV === "development") {
        console.log(`🔐 User signed in${isNewUser ? ' (new user)' : ''}`);
        
        if (isNewUser) {
          console.log(`🎉 Welcome new user`);
        }
      }
    },
    async signOut({ token, session }) {
      if (process.env.NODE_ENV === "development") {
        console.log(`🚪 User signed out`);
      }
    },
    async updateUser({ user }) {
      if (process.env.NODE_ENV === "development") {
        console.log(`📝 User updated`);
      }
    },
  },
}