"use client"

import { motion } from "framer-motion"
import { Sparkles, MapPin, Clock, Users, ArrowRight } from "lucide-react"

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Planning",
      description: "Get personalized itineraries created by advanced AI in minutes"
    },
    {
      icon: MapPin,
      title: "Local Insights",
      description: "Discover hidden gems and authentic experiences from local experts"
    },
    {
      icon: Clock,
      title: "Save Time",
      description: "No more hours of research - we handle the planning for you"
    },
    {
      icon: Users,
      title: "Group Friendly",
      description: "Perfect for solo travelers, couples, families, and groups"
    }
  ]

  return (
    <div className="text-center space-y-8">
      {/* Hero content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          Welcome to Terra Voyage!
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Let&apos;s create your perfect travel experience. We&apos;ll ask you a few quick questions 
          to understand your travel style and preferences.
        </p>
      </motion.div>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-8"
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          What You&apos;ll Get:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Personalized daily itineraries</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Restaurant & activity recommendations</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Budget-optimized suggestions</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-gray-700 dark:text-gray-300">Interactive maps & directions</span>
          </div>
        </div>
      </motion.div>

      {/* Time estimate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400"
      >
        <Clock className="w-5 h-5" />
        <span>Takes about 3 minutes to complete</span>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="pt-4"
      >
        <motion.button
          onClick={onNext}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg transition-all duration-300 flex items-center mx-auto"
        >
          Let&apos;s Get Started
          <ArrowRight className="ml-2 w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  )
}

export default WelcomeStep