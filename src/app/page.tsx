"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

import { HeroSection } from "@/components/landing/hero-section"
import { SampleItineraries } from "@/components/landing/sample-itineraries"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Testimonials } from "@/components/landing/testimonials"
import { Footer } from "@/components/landing/footer"
import { OnboardingModal } from "@/components/onboarding/onboarding-modal"
import { OnboardingData } from "@/lib/onboarding-validation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)

  const handleStartPlanning = () => {
    if (status === "loading") return

    if (!session) {
      // Redirect to sign in with callback to planning page
      router.push("/auth/signin?callbackUrl=/plan")
      return
    }

    // Check if user has completed onboarding
    // In a real app, this would be checked from user profile
    const hasCompletedOnboarding = false // This would come from user data

    if (!hasCompletedOnboarding) {
      setShowOnboarding(true)
    } else {
      router.push("/plan")
    }
  }

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log("Onboarding completed:", data)
    setShowOnboarding(false)
    router.push("/plan")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <HeroSection onStartPlanning={handleStartPlanning} />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Sample Itineraries Section */}
      <SampleItineraries />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Footer */}
      <Footer />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}