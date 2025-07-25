"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react"

import { WelcomeStep } from "./steps/welcome-step"
import { TravelStyleStep } from "./steps/travel-style-step"
import { InterestsStep } from "./steps/interests-step" 
import { PreferencesStep } from "./steps/preferences-step"
import { CompleteStep } from "./steps/complete-step"

import {
  OnboardingData,
  TravelStyleData,
  InterestsData,
  TravelPreferencesData,
  defaultTravelStyle,
  defaultInterests,
  defaultTravelPreferences,
  getProgressPercentage,
  getStepTitle,
  getStepDescription,
  validateCompleteOnboarding
} from "@/lib/onboarding-validation"

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: OnboardingData) => void
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const userId = 'guest-user' // Simple guest user ID for local storage
  
  // Form data state
  const [travelStyle, setTravelStyle] = useState<TravelStyleData>(defaultTravelStyle)
  const [interests, setInterests] = useState<InterestsData>(defaultInterests)
  const [preferences, setPreferences] = useState<TravelPreferencesData>(defaultTravelPreferences)

  const totalSteps = 5

  // Load saved onboarding data if available
  useEffect(() => {
    if (isOpen) {
      loadSavedData()
    }
  }, [isOpen])

  const loadSavedData = async () => {
    try {
      const saved = localStorage.getItem(`onboarding-${userId}`)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.travelStyle) setTravelStyle(data.travelStyle)
        if (data.interests) setInterests(data.interests)
        if (data.preferences) setPreferences(data.preferences)
        if (data.currentStep) setCurrentStep(data.currentStep)
      }
    } catch (error) {
      console.error("Failed to load saved onboarding data:", error)
    }
  }

  const saveProgress = () => {
    const progressData = {
      travelStyle,
      interests,
      preferences,
      currentStep,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(`onboarding-${userId}`, JSON.stringify(progressData))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      saveProgress()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    
    try {
      const onboardingData: OnboardingData = {
        travelStyle,
        interests,
        preferences,
        completedAt: new Date()
      }

      const validation = validateCompleteOnboarding(onboardingData)
      if (!validation.success) {
        console.error("Validation failed:", validation.error)
        setIsLoading(false)
        return
      }

      // Save to local storage for now (simplified)
      localStorage.setItem('user-onboarding-complete', JSON.stringify(onboardingData))
      
      // Clear temporary storage
      localStorage.removeItem(`onboarding-${userId}`)

      onComplete(validation.data)
    } catch (error) {
      console.error("Failed to complete onboarding:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true // Welcome step
      case 2: return travelStyle.travelStyle && travelStyle.pacePreference
      case 3: return interests.interests.length > 0
      case 4: return preferences.accommodationType && preferences.transportationPreference
      case 5: return true // Complete step
      default: return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />
      case 2:
        return (
          <TravelStyleStep
            data={travelStyle}
            onChange={setTravelStyle}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      case 3:
        return (
          <InterestsStep
            data={interests}
            onChange={setInterests}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      case 4:
        return (
          <PreferencesStep
            data={preferences}
            onChange={setPreferences}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        )
      case 5:
        return (
          <CompleteStep
            travelStyle={travelStyle}
            interests={interests}
            preferences={preferences}
            onComplete={handleComplete}
            onPrevious={handlePrevious}
            isLoading={isLoading}
          />
        )
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {getStepTitle(currentStep)}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {getStepDescription(currentStep)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getProgressPercentage(currentStep, totalSteps)}% complete
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${getProgressPercentage(currentStep, totalSteps)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer - only show for steps 2-4 */}
          {currentStep >= 2 && currentStep <= 4 && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handlePrevious}
                className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OnboardingModal