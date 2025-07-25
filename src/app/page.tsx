"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { HeroSection } from "@/components/landing/hero-section"
import { SampleItineraries } from "@/components/landing/sample-itineraries"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Testimonials } from "@/components/landing/testimonials"
import { Footer } from "@/components/landing/footer"
import { OnboardingModal } from "@/components/onboarding/onboarding-modal"
import { OnboardingData } from "@/lib/onboarding-validation"

export default function Home() {
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)

  const handleStartPlanning = () => {
    // Check if user wants onboarding or go directly to plan
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed') === 'true'

    if (!hasCompletedOnboarding) {
      setShowOnboarding(true)
    } else {
      router.push("/plan")
    }
  }

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log("Onboarding completed:", data)
    localStorage.setItem('onboarding_completed', 'true')
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