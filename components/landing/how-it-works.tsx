"use client"

import { motion } from "framer-motion"
import { MessageSquare, Sparkles, MapPin, Share2, ArrowRight } from "lucide-react"

const steps = [
  {
    step: 1,
    title: "Tell Us Your Preferences",
    description: "Share your travel style, interests, budget, and any special requirements. Our smart questionnaire takes just 2 minutes.",
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-500",
    features: ["Travel style assessment", "Interest preferences", "Budget & group size", "Dietary & accessibility needs"]
  },
  {
    step: 2, 
    title: "AI Creates Your Itinerary",
    description: "Our advanced AI analyzes thousands of destinations and creates a personalized day-by-day itinerary just for you.",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-500", 
    features: ["Real-time data analysis", "Local insights integration", "Budget optimization", "Personalized recommendations"]
  },
  {
    step: 3,
    title: "Explore & Customize",
    description: "Review your itinerary with interactive maps, detailed information, and the ability to modify any part of your trip.",
    icon: MapPin,
    color: "from-green-500 to-emerald-500",
    features: ["Interactive maps", "Venue details & photos", "Easy modifications", "Alternative suggestions"]
  },
  {
    step: 4,
    title: "Book & Share",
    description: "Book directly through our platform or export your itinerary. Share with travel companions and enjoy your perfect trip!",
    icon: Share2,
    color: "from-orange-500 to-red-500",
    features: ["Direct booking integration", "Export to calendar", "Share with friends", "Real-time updates"]
  }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            From idea to itinerary in minutes - our AI-powered platform makes travel planning effortless
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-20">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`flex flex-col ${
                index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
              } items-center gap-12`}
            >
              {/* Content */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                    {step.step}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                  {step.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {step.features.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + featureIndex * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center space-x-3"
                    >
                      <div className={`w-2 h-2 bg-gradient-to-r ${step.color} rounded-full`} />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    viewport={{ once: true }}
                    className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 lg:hidden"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                )}
              </div>

              {/* Visual */}
              <div className="flex-1 relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* Main circle */}
                  <div className={`w-64 h-64 mx-auto bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center shadow-2xl`}>
                    <step.icon className="w-24 h-24 text-white" />
                  </div>

                  {/* Floating elements */}
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-4 -right-4 w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold text-gray-800 dark:text-white">
                      {step.step}
                    </span>
                  </motion.div>

                  {/* Decorative dots */}
                  <div className="absolute -bottom-8 -left-8 w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full opacity-60" />
                  <div className="absolute -top-8 -left-12 w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full opacity-40" />
                  <div className="absolute -bottom-12 -right-8 w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full opacity-80" />
                </motion.div>

                {/* Arrow to next step (desktop only) */}
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    viewport={{ once: true }}
                    className={`hidden lg:block absolute ${
                      index % 2 === 0 ? '-right-16' : '-left-16'
                    } top-1/2 transform -translate-y-1/2`}
                  >
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`text-gray-400 dark:text-gray-500 ${
                        index % 2 === 0 ? '' : 'rotate-180'
                      }`}
                    >
                      <ArrowRight className="w-8 h-8" />
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Demo CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              See It In Action
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              Ready to experience the magic of AI-powered travel planning? Start your journey now and get your first itinerary in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-300 flex items-center"
              >
                Try It Free Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </motion.button>
              <button className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                Watch Demo Video
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default HowItWorks