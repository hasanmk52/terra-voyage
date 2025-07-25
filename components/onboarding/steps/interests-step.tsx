"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { 
  Landmark, Utensils, Mountain, Waves, Music, ShoppingBag,
  Trees, Palette, Camera, Users, Crown, Baby, Heart, Briefcase,
  Church, Umbrella, AlertTriangle, Wheat, Milk, Nut
} from "lucide-react"
import { InterestsData } from "@/lib/onboarding-validation"

interface InterestsStepProps {
  data: InterestsData
  onChange: (data: InterestsData) => void
  onNext: () => void
  onPrevious: () => void
}

export function InterestsStep({ data, onChange, onNext, onPrevious }: InterestsStepProps) {
  const [showDietary, setShowDietary] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)

  const interestOptions = [
    { 
      id: "culture", 
      label: "Culture & History", 
      icon: Landmark,
      description: "Museums, historical sites, cultural experiences",
      color: "from-orange-500 to-red-600"
    },
    { 
      id: "food", 
      label: "Food & Dining", 
      icon: Utensils,
      description: "Local cuisine, restaurants, food tours",
      color: "from-yellow-500 to-orange-600"
    },
    { 
      id: "adventure", 
      label: "Adventure Sports", 
      icon: Mountain,
      description: "Hiking, extreme sports, outdoor activities",
      color: "from-green-500 to-emerald-600"
    },
    { 
      id: "relaxation", 
      label: "Relaxation", 
      icon: Waves,
      description: "Spas, beaches, peaceful locations",
      color: "from-teal-500 to-cyan-600"
    },
    { 
      id: "nightlife", 
      label: "Nightlife", 
      icon: Music,
      description: "Bars, clubs, entertainment venues",
      color: "from-purple-500 to-pink-600"
    },
    { 
      id: "shopping", 
      label: "Shopping", 
      icon: ShoppingBag,
      description: "Markets, boutiques, local crafts",
      color: "from-pink-500 to-rose-600"
    },
    { 
      id: "nature", 
      label: "Nature & Wildlife", 
      icon: Trees,
      description: "Parks, wildlife, scenic views",
      color: "from-green-600 to-lime-600"
    },
    { 
      id: "art", 
      label: "Art & Creativity", 
      icon: Palette,
      description: "Galleries, street art, creative spaces",
      color: "from-indigo-500 to-purple-600"
    },
    { 
      id: "photography", 
      label: "Photography", 
      icon: Camera,
      description: "Scenic spots, Instagram-worthy locations",
      color: "from-blue-500 to-indigo-600"
    },
    { 
      id: "local-life", 
      label: "Local Life", 
      icon: Users,
      description: "Authentic experiences, meeting locals",
      color: "from-amber-500 to-orange-600"
    },
    { 
      id: "luxury", 
      label: "Luxury Experiences", 
      icon: Crown,
      description: "High-end experiences, premium services",
      color: "from-purple-600 to-violet-600"
    },
    { 
      id: "family", 
      label: "Family Activities", 
      icon: Baby,
      description: "Kid-friendly activities, family attractions",
      color: "from-cyan-500 to-blue-600"
    },
    { 
      id: "romance", 
      label: "Romance", 
      icon: Heart,
      description: "Romantic dinners, couple activities",
      color: "from-red-500 to-pink-600"
    },
    { 
      id: "business", 
      label: "Business & Networking", 
      icon: Briefcase,
      description: "Networking opportunities, business venues",
      color: "from-gray-500 to-slate-600"
    },
    { 
      id: "spiritual", 
      label: "Spiritual & Wellness", 
      icon: Church,
      description: "Religious sites, meditation, spiritual retreats",
      color: "from-violet-500 to-purple-600"
    },
    { 
      id: "beach", 
      label: "Beach & Water", 
      icon: Umbrella,
      description: "Water sports, coastal activities, beach relaxation",
      color: "from-cyan-500 to-teal-600"
    }
  ]

  const dietaryOptions = [
    { id: "vegetarian", label: "Vegetarian", icon: Wheat },
    { id: "vegan", label: "Vegan", icon: Wheat },
    { id: "gluten-free", label: "Gluten-Free", icon: Wheat },
    { id: "halal", label: "Halal", icon: Wheat },
    { id: "kosher", label: "Kosher", icon: Wheat },
    { id: "dairy-free", label: "Dairy-Free", icon: Milk },
    { id: "nut-allergies", label: "Nut Allergies", icon: Nut },
    { id: "other", label: "Other", icon: AlertTriangle }
  ]

  const handleInterestToggle = (interestId: string) => {
    const currentInterests = data.interests || []
    const isSelected = currentInterests.includes(interestId as any)
    
    const newInterests = isSelected
      ? currentInterests.filter(id => id !== interestId)
      : [...currentInterests, interestId as any]
    
    onChange({ ...data, interests: newInterests })
  }

  const handleDietaryToggle = (dietaryId: string) => {
    const currentDietary = data.dietaryRestrictions || []
    const isSelected = currentDietary.includes(dietaryId as any)
    
    const newDietary = isSelected
      ? currentDietary.filter(id => id !== dietaryId)
      : [...currentDietary, dietaryId as any]
    
    onChange({ ...data, dietaryRestrictions: newDietary })
  }

  const handleAccessibilityChange = (field: string, value: boolean) => {
    onChange({
      ...data,
      accessibilityNeeds: {
        ...data.accessibilityNeeds,
        [field]: value
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Interests Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What interests you most?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Select all that apply - this helps us personalize your recommendations
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {interestOptions.map((interest, index) => (
            <motion.button
              key={interest.id}
              onClick={() => handleInterestToggle(interest.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                data.interests?.includes(interest.id as any)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${interest.color} flex items-center justify-center`}>
                  <interest.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {interest.label}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {interest.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {data.interests && data.interests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl"
          >
            <p className="text-green-800 dark:text-green-200 text-sm">
              ✓ {data.interests.length} interest{data.interests.length > 1 ? 's' : ''} selected
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Dietary Restrictions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Dietary Restrictions
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Optional - helps us recommend suitable restaurants
            </p>
          </div>
          <button
            onClick={() => setShowDietary(!showDietary)}
            className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showDietary ? 'Hide' : 'Add Dietary Restrictions'}
          </button>
        </div>

        {showDietary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {dietaryOptions.map((dietary) => (
              <button
                key={dietary.id}
                onClick={() => handleDietaryToggle(dietary.id)}
                className={`p-3 rounded-lg border-2 text-sm transition-all duration-200 flex items-center space-x-2 ${
                  data.dietaryRestrictions?.includes(dietary.id as any)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <dietary.icon className="w-4 h-4" />
                <span>{dietary.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Accessibility Needs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Accessibility Needs
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Optional - helps us recommend accessible activities and venues
            </p>
          </div>
          <button
            onClick={() => setShowAccessibility(!showAccessibility)}
            className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:text-blue-700 dark:hover:text-blue-300"
          >
            {showAccessibility ? 'Hide' : 'Add Accessibility Needs'}
          </button>
        </div>

        {showAccessibility && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl"
          >
            {[
              { key: 'wheelchairAccess', label: 'Wheelchair Access Required' },
              { key: 'visualImpairment', label: 'Visual Impairment Accommodations' },
              { key: 'hearingImpairment', label: 'Hearing Impairment Accommodations' },
              { key: 'mobilityAssistance', label: 'Mobility Assistance Needed' }
            ].map((item) => (
              <label key={item.key} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.accessibilityNeeds?.[item.key as keyof typeof data.accessibilityNeeds] || false}
                  onChange={(e) => handleAccessibilityChange(item.key, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
              </label>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Selection Summary */}
      {data.interests && data.interests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Your Selected Interests:
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.interests.map((interestId) => {
              const interest = interestOptions.find(i => i.id === interestId)
              return interest ? (
                <span
                  key={interestId}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                >
                  {interest.label}
                </span>
              ) : null
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default InterestsStep