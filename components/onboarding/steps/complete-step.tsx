"use client"

import { motion } from "framer-motion"
import { Check, Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { TravelStyleData, InterestsData, TravelPreferencesData } from "@/lib/onboarding-validation"

interface CompleteStepProps {
  travelStyle: TravelStyleData
  interests: InterestsData
  preferences: TravelPreferencesData
  onComplete: () => void
  onPrevious: () => void
  isLoading: boolean
}

export function CompleteStep({ 
  travelStyle, 
  interests, 
  preferences, 
  onComplete, 
  onPrevious, 
  isLoading 
}: CompleteStepProps) {
  const getSummaryData = () => {
    const interestOptions = [
      { id: "culture", label: "Culture & History" },
      { id: "food", label: "Food & Dining" },
      { id: "adventure", label: "Adventure Sports" },
      { id: "relaxation", label: "Relaxation" },
      { id: "nightlife", label: "Nightlife" },
      { id: "shopping", label: "Shopping" },
      { id: "nature", label: "Nature & Wildlife" },
      { id: "art", label: "Art & Creativity" },
      { id: "photography", label: "Photography" },
      { id: "local-life", label: "Local Life" },
      { id: "luxury", label: "Luxury Experiences" },
      { id: "family", label: "Family Activities" },
      { id: "romance", label: "Romance" },
      { id: "business", label: "Business & Networking" },
      { id: "spiritual", label: "Spiritual & Wellness" },
      { id: "beach", label: "Beach & Water" }
    ]

    return {
      travelStyle: travelStyle.travelStyle.charAt(0).toUpperCase() + travelStyle.travelStyle.slice(1),
      pace: travelStyle.pacePreference.charAt(0).toUpperCase() + travelStyle.pacePreference.slice(1),
      groupSize: travelStyle.groupSize.charAt(0).toUpperCase() + travelStyle.groupSize.slice(1),
      budget: travelStyle.budgetRange === 'no-preference' ? 'No Preference' : 
               travelStyle.budgetRange.charAt(0).toUpperCase() + travelStyle.budgetRange.slice(1),
      interests: interests.interests.map(id => 
        interestOptions.find(opt => opt.id === id)?.label || id
      ).slice(0, 5), // Show first 5 interests
      totalInterests: interests.interests.length,
      accommodation: preferences.accommodationType === 'mid-range' ? 'Mid-Range' :
                    preferences.accommodationType.charAt(0).toUpperCase() + preferences.accommodationType.slice(1),
      transportation: preferences.transportationPreference === 'rental-car' ? 'Rental Car' :
                     preferences.transportationPreference.charAt(0).toUpperCase() + preferences.transportationPreference.slice(1),
      meals: preferences.mealPreferences === 'local-food' ? 'Local Cuisine' :
             preferences.mealPreferences === 'familiar-food' ? 'Familiar Food' :
             preferences.mealPreferences === 'fine-dining' ? 'Fine Dining' :
             preferences.mealPreferences === 'street-food' ? 'Street Food' :
             'Mixed Options',
      activity: preferences.activityLevel.charAt(0).toUpperCase() + preferences.activityLevel.slice(1),
      culture: preferences.culturalImmersion === 'deep' ? 'Deep Immersion' :
               preferences.culturalImmersion.charAt(0).toUpperCase() + preferences.culturalImmersion.slice(1)
    }
  }

  const summary = getSummaryData()

  return (
    <div className="text-center space-y-8">
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
        className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Check className="w-10 h-10 text-white" />
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="space-y-4"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Profile Complete!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Perfect! We&apos;ve created your personalized travel profile. 
          You&apos;re all set to start planning amazing trips.
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
      >
        {/* Travel Style Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 text-left">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Travel Style
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Style:</span>
              <span className="font-medium text-gray-900 dark:text-white">{summary.travelStyle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Pace:</span>
              <span className="font-medium text-gray-900 dark:text-white">{summary.pace}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Group:</span>
              <span className="font-medium text-gray-900 dark:text-white">{summary.groupSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Budget:</span>
              <span className="font-medium text-gray-900 dark:text-white">{summary.budget}</span>
            </div>
          </div>
        </div>

        {/* Interests Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 text-left">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
              <Check className="w-4 h-4 text-white" />
            </div>
            Your Interests
          </h3>
          <div className="space-y-2">
            {summary.interests.map((interest, index) => (
              <div key={index} className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{interest}</span>
              </div>
            ))}
            {summary.totalInterests > 5 && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-300 rounded-full mr-3" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  +{summary.totalInterests - 5} more interests
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Preferences Card */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 text-left md:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
              <Check className="w-4 h-4 text-white" />
            </div>
            Travel Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Stay:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.accommodation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Transport:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.transportation}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dining:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.meals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.activity}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Culture:</span>
                <span className="font-medium text-gray-900 dark:text-white">{summary.culture}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          What Happens Next?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Personalized Recommendations</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Get AI-powered suggestions tailored to your preferences
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Smart Itineraries</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Receive detailed day-by-day plans optimized for your style
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Easy Planning</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Book, modify, and share your trips with ease
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
      >
        <motion.button
          onClick={onComplete}
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.05 }}
          whileTap={{ scale: isLoading ? 1 : 0.95 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg transition-all duration-300 flex items-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              Complete Setup
              <ArrowRight className="ml-2 w-5 h-5" />
            </>
          )}
        </motion.button>

        <motion.button
          onClick={onPrevious}
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-semibold transition-all duration-300"
        >
          Go Back
        </motion.button>
      </motion.div>

      {/* Privacy Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto"
      >
        Your preferences are saved securely and can be updated anytime in your profile settings.
      </motion.div>
    </div>
  )
}

export default CompleteStep