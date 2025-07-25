"use client"

import { motion } from "framer-motion"
import { 
  Bed, Home, Crown, Shuffle as ShuffleIcon,
  MapPin, Car, Train, CarTaxiFront,
  Utensils, ChefHat, Wine, Sandwich,
  Activity, Zap, Gauge,
  Globe, Users, Heart
} from "lucide-react"
import { TravelPreferencesData } from "@/lib/onboarding-validation"

interface PreferencesStepProps {
  data: TravelPreferencesData
  onChange: (data: TravelPreferencesData) => void
  onNext: () => void
  onPrevious: () => void
}

export function PreferencesStep({ data, onChange, onNext, onPrevious }: PreferencesStepProps) {
  const accommodationOptions = [
    { 
      id: "budget", 
      label: "Budget", 
      icon: Bed,
      description: "Hostels, budget hotels, shared accommodations",
      priceRange: "$20-60/night"
    },
    { 
      id: "mid-range", 
      label: "Mid-Range", 
      icon: Home,
      description: "3-star hotels, boutique properties, private rooms",
      priceRange: "$60-150/night"
    },
    { 
      id: "luxury", 
      label: "Luxury", 
      icon: Crown,
      description: "4-5 star hotels, resorts, premium amenities",
      priceRange: "$150+/night"
    },
    { 
      id: "mixed", 
      label: "Mixed", 
      icon: ShuffleIcon,
      description: "Variety of accommodation types based on location",
      priceRange: "Varies"
    }
  ]

  const transportationOptions = [
    { 
      id: "walking", 
      label: "Walking", 
      icon: MapPin,
      description: "Walking distances only, explore on foot",
      sustainability: "Eco-friendly"
    },
    { 
      id: "public", 
      label: "Public Transport", 
      icon: Train,
      description: "Buses, trains, metro systems",
      sustainability: "Eco-friendly"
    },
    { 
      id: "rental-car", 
      label: "Rental Car", 
      icon: Car,
      description: "Flexibility and independence with own vehicle",
      sustainability: "Moderate impact"
    },
    { 
      id: "mixed", 
      label: "Mixed Methods", 
      icon: CarTaxiFront,
      description: "Combination based on convenience and distance",
      sustainability: "Balanced"
    }
  ]

  const mealOptions = [
    { 
      id: "local-food", 
      label: "Local Cuisine", 
      icon: ChefHat,
      description: "Authentic local dishes and traditional restaurants"
    },
    { 
      id: "familiar-food", 
      label: "Familiar Food", 
      icon: Sandwich,
      description: "International cuisine and familiar food options"
    },
    { 
      id: "fine-dining", 
      label: "Fine Dining", 
      icon: Wine,
      description: "High-end restaurants and gourmet experiences"
    },
    { 
      id: "street-food", 
      label: "Street Food", 
      icon: Utensils,
      description: "Local street vendors and casual dining"
    },
    { 
      id: "mixed", 
      label: "Mixed Options", 
      icon: ShuffleIcon,
      description: "Variety of dining experiences"
    }
  ]

  const activityLevels = [
    { 
      id: "low", 
      label: "Low Activity", 
      icon: Activity,
      description: "Minimal physical activity, relaxed pace",
      examples: "Museums, cafes, scenic drives"
    },
    { 
      id: "moderate", 
      label: "Moderate Activity", 
      icon: Gauge,
      description: "Some walking and light physical activity",
      examples: "City walks, light hiking, cycling"
    },
    { 
      id: "high", 
      label: "High Activity", 
      icon: Zap,
      description: "Lots of physical activity and adventure",
      examples: "Hiking, sports, adventure activities"
    }
  ]

  const culturalImmersionLevels = [
    { 
      id: "minimal", 
      label: "Minimal", 
      icon: Globe,
      description: "Tourist attractions, English-speaking guides"
    },
    { 
      id: "moderate", 
      label: "Moderate", 
      icon: Users,
      description: "Mix of tourist sites and local experiences"
    },
    { 
      id: "deep", 
      label: "Deep Immersion", 
      icon: Heart,
      description: "Authentic local experiences, cultural exchange"
    }
  ]

  const handlePreferenceChange = (field: keyof TravelPreferencesData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const OptionCard = ({ 
    option, 
    isSelected, 
    onClick, 
    showExtra = false 
  }: { 
    option: any, 
    isSelected: boolean, 
    onClick: () => void,
    showExtra?: boolean 
  }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${
          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}>
          <option.icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${
            isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
          }`}>
            {option.label}
          </h3>
          <p className={`text-sm mt-1 ${
            isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
          }`}>
            {option.description}
          </p>
          {showExtra && option.priceRange && (
            <p className={`text-xs mt-2 font-medium ${
              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-500'
            }`}>
              {option.priceRange}
            </p>
          )}
          {showExtra && option.sustainability && (
            <p className={`text-xs mt-1 font-medium ${
              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-500'
            }`}>
              {option.sustainability}
            </p>
          )}
          {showExtra && option.examples && (
            <p className={`text-xs mt-1 italic ${
              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-500'
            }`}>
              e.g., {option.examples}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  )

  return (
    <div className="space-y-8">
      {/* Accommodation Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Accommodation Preference
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          What type of places do you prefer to stay?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accommodationOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              isSelected={data.accommodationType === option.id}
              onClick={() => handlePreferenceChange('accommodationType', option.id)}
              showExtra={true}
            />
          ))}
        </div>
      </motion.div>

      {/* Transportation Preference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Transportation Preference
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          How do you prefer to get around?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transportationOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              isSelected={data.transportationPreference === option.id}
              onClick={() => handlePreferenceChange('transportationPreference', option.id)}
              showExtra={true}
            />
          ))}
        </div>
      </motion.div>

      {/* Meal Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dining Preferences
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          What kind of food experiences do you enjoy?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mealOptions.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              isSelected={data.mealPreferences === option.id}
              onClick={() => handlePreferenceChange('mealPreferences', option.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Activity Level */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Activity Level
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          How much physical activity do you enjoy while traveling?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activityLevels.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              isSelected={data.activityLevel === option.id}
              onClick={() => handlePreferenceChange('activityLevel', option.id)}
              showExtra={true}
            />
          ))}
        </div>
      </motion.div>

      {/* Cultural Immersion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cultural Immersion Level
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          How deeply do you want to experience local culture?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {culturalImmersionLevels.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              isSelected={data.culturalImmersion === option.id}
              onClick={() => handlePreferenceChange('culturalImmersion', option.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6"
      >
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Your Travel Profile Preview:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Accommodation:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {accommodationOptions.find(o => o.id === data.accommodationType)?.label || 'Not selected'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Transportation:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {transportationOptions.find(o => o.id === data.transportationPreference)?.label || 'Not selected'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Dining:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {mealOptions.find(o => o.id === data.mealPreferences)?.label || 'Not selected'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Activity Level:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {activityLevels.find(o => o.id === data.activityLevel)?.label || 'Not selected'}
            </span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Cultural Immersion:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              {culturalImmersionLevels.find(o => o.id === data.culturalImmersion)?.label || 'Not selected'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default PreferencesStep