"use client"

import { motion } from "framer-motion"
import { Mountain, Crown, Wallet, Landmark, Waves, Shuffle, 
         Turtle, Gauge, Rabbit, User, Users, UserCheck, UsersRound,
         DollarSign, Gem, PiggyBank, HelpCircle } from "lucide-react"
import { TravelStyleData } from "@/lib/onboarding-validation"

interface TravelStyleStepProps {
  data: TravelStyleData
  onChange: (data: TravelStyleData) => void
  onNext: () => void
  onPrevious: () => void
}

export function TravelStyleStep({ data, onChange, onNext, onPrevious }: TravelStyleStepProps) {
  const travelStyles = [
    { 
      id: "adventure", 
      label: "Adventure", 
      icon: Mountain,
      description: "Hiking, extreme sports, off-the-beaten-path experiences",
      color: "from-green-500 to-emerald-600"
    },
    { 
      id: "luxury", 
      label: "Luxury", 
      icon: Crown,
      description: "Premium accommodations, fine dining, exclusive experiences",
      color: "from-purple-500 to-violet-600"
    },
    { 
      id: "budget", 
      label: "Budget", 
      icon: Wallet,
      description: "Affordable options, local experiences, money-saving tips",
      color: "from-blue-500 to-cyan-600"
    },
    { 
      id: "cultural", 
      label: "Cultural", 
      icon: Landmark,
      description: "Museums, historical sites, local traditions and customs",
      color: "from-orange-500 to-red-600"
    },
    { 
      id: "relaxation", 
      label: "Relaxation", 
      icon: Waves,
      description: "Beaches, spas, peaceful locations, slow-paced activities",
      color: "from-teal-500 to-cyan-600"
    },
    { 
      id: "mixed", 
      label: "Mixed", 
      icon: Shuffle,
      description: "A combination of different travel styles and experiences",
      color: "from-indigo-500 to-purple-600"
    }
  ]

  const paceOptions = [
    { 
      id: "slow", 
      label: "Slow & Relaxed", 
      icon: Turtle,
      description: "2-3 activities per day, plenty of rest time"
    },
    { 
      id: "moderate", 
      label: "Moderate", 
      icon: Gauge,
      description: "4-5 activities per day, balanced schedule"
    },
    { 
      id: "fast", 
      label: "Fast-Paced", 
      icon: Rabbit,
      description: "6+ activities per day, maximize experiences"
    }
  ]

  const groupSizes = [
    { 
      id: "solo", 
      label: "Solo Traveler", 
      icon: User,
      description: "Just me, independent exploration"
    },
    { 
      id: "couple", 
      label: "Couple", 
      icon: UserCheck,
      description: "Two people, romantic experiences"
    },
    { 
      id: "family", 
      label: "Family", 
      icon: Users,
      description: "Family with children, kid-friendly activities"
    },
    { 
      id: "group", 
      label: "Group", 
      icon: UsersRound,
      description: "Friends or larger groups, social experiences"
    }
  ]

  const budgetRanges = [
    { 
      id: "budget", 
      label: "Budget", 
      icon: PiggyBank,
      description: "Focus on affordable options and savings"
    },
    { 
      id: "mid-range", 
      label: "Mid-Range", 
      icon: DollarSign,
      description: "Balance of comfort and value"
    },
    { 
      id: "luxury", 
      label: "Luxury", 
      icon: Gem,
      description: "Premium experiences and accommodations"
    },
    { 
      id: "no-preference", 
      label: "No Preference", 
      icon: HelpCircle,
      description: "Open to all price ranges"
    }
  ]

  const handleStyleChange = (field: keyof TravelStyleData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const OptionCard = ({ 
    option, 
    isSelected, 
    onClick, 
    className = "" 
  }: { 
    option: any, 
    isSelected: boolean, 
    onClick: () => void,
    className?: string 
  }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      } ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${
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
        </div>
      </div>
    </motion.button>
  )

  return (
    <div className="space-y-8">
      {/* Travel Style Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What&apos;s your travel style?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Choose the style that best describes how you like to travel
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {travelStyles.map((style) => (
            <motion.button
              key={style.id}
              onClick={() => handleStyleChange('travelStyle', style.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                data.travelStyle === style.id 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${style.color} flex items-center justify-center`}>
                  <style.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {style.label}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {style.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Pace Preference */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What&apos;s your preferred pace?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          How many activities do you like to pack into a day?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paceOptions.map((pace) => (
            <OptionCard
              key={pace.id}
              option={pace}
              isSelected={data.pacePreference === pace.id}
              onClick={() => handleStyleChange('pacePreference', pace.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Group Size */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Who are you traveling with?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          This helps us recommend appropriate activities and accommodations
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {groupSizes.map((group) => (
            <OptionCard
              key={group.id}
              option={group}
              isSelected={data.groupSize === group.id}
              onClick={() => handleStyleChange('groupSize', group.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Budget Range */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What&apos;s your budget preference?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Help us suggest options that fit your budget
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {budgetRanges.map((budget) => (
            <OptionCard
              key={budget.id}
              option={budget}
              isSelected={data.budgetRange === budget.id}
              onClick={() => handleStyleChange('budgetRange', budget.id)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default TravelStyleStep