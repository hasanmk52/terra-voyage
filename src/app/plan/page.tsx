"use client"

import { TripPlanningForm } from "@/components/forms/trip-planning-form"

export default function PlanTripPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Plan Your Perfect Trip
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tell us about your dream destination and we&apos;ll create a personalized 
            itinerary just for you using AI-powered recommendations.
          </p>
        </div>

        <TripPlanningForm />
      </div>
    </div>
  )
}