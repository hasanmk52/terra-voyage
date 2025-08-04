"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Star,
  Quote,
  CheckCircle,
  Users,
  MapPin,
  Clock,
  Award,
} from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatar: string;
  rating: number;
  text: string;
  tripDestination: string;
  tripType: string;
  verified: boolean;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    location: "New York, USA",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face&auto=format",
    rating: 5,
    text: "Terra Voyage planned the most incredible 10-day trip to Japan for my family. The AI understood exactly what we wanted - cultural experiences mixed with kid-friendly activities. Every recommendation was spot-on!",
    tripDestination: "Tokyo, Japan",
    tripType: "Family Adventure",
    verified: true,
  },
  {
    id: "2",
    name: "Marcus Chen",
    location: "San Francisco, USA",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format",
    rating: 5,
    text: "As a solo traveler, I was skeptical about AI planning. But Terra Voyage created an amazing backpacking route through Southeast Asia that perfectly matched my budget and adventure preferences. Saved me weeks of research!",
    tripDestination: "Southeast Asia",
    tripType: "Solo Backpacking",
    verified: true,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    location: "Madrid, Spain",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format",
    rating: 5,
    text: "Planning our honeymoon was stressful until we found Terra Voyage. The romantic itinerary for Bali was absolutely perfect - from secluded beaches to couples spa treatments. It felt like it was crafted just for us!",
    tripDestination: "Bali, Indonesia",
    tripType: "Romantic Honeymoon",
    verified: true,
  },
  {
    id: "4",
    name: "David Thompson",
    location: "London, UK",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format",
    rating: 5,
    text: "The business trip feature is incredible. Terra Voyage found the perfect hotels near my meetings and even suggested networking events. Plus the cultural recommendations helped me make the most of my free time in Singapore.",
    tripDestination: "Singapore",
    tripType: "Business Travel",
    verified: true,
  },
  {
    id: "5",
    name: "Lisa Park",
    location: "Toronto, Canada",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=150&h=150&fit=crop&crop=face&auto=format",
    rating: 5,
    text: "I have mobility restrictions and travel planning was always challenging. Terra Voyage's accessibility features are amazing - every venue and activity was perfectly accessible. Finally, stress-free travel planning!",
    tripDestination: "Paris, France",
    tripType: "Accessible Travel",
    verified: true,
  },
  {
    id: "6",
    name: "Ahmed Hassan",
    location: "Dubai, UAE",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face&auto=format",
    rating: 5,
    text: "The cultural immersion recommendations were outstanding. Terra Voyage connected me with local guides and authentic experiences in Morocco that I never would have found on my own. Truly unforgettable!",
    tripDestination: "Marrakech, Morocco",
    tripType: "Cultural Immersion",
    verified: true,
  },
];

const stats = [
  { icon: Users, label: "Happy Travelers", value: "50,000+" },
  { icon: MapPin, label: "Destinations Covered", value: "500+" },
  { icon: Clock, label: "Hours Saved", value: "100,000+" },
  { icon: Award, label: "Average Rating", value: "4.9/5" },
];

export function Testimonials() {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (testimonialId: string) => {
    setImageErrors((prev) => new Set(prev).add(testimonialId));
  };

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
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
            Loved by Travelers Worldwide
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Join thousands of travelers who have discovered their perfect trips
            with our AI-powered planning
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-white dark:bg-gray-700 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <stat.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="flex justify-between items-start mb-4">
                <Quote className="w-8 h-8 text-blue-500 opacity-60" />
                <div className="flex items-center space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* User Info */}
              <div className="flex items-center space-x-4 mb-4">
                {!imageErrors.has(testimonial.id) ? (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={() => handleImageError(testimonial.id)}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h4>
                    {testimonial.verified && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.location}
                  </p>
                </div>
              </div>

              {/* Trip Info */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Destination:
                    </span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {testimonial.tripDestination}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                    {testimonial.tripType}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-white dark:bg-gray-700 rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Trusted by Travel Enthusiasts
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    100% Secure
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Your data is protected
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    24/7 Support
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    We&apos;re here to help
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Award Winning
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Best Travel AI 2024
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Ready to join thousands of happy travelers?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
          >
            Start Your Journey Today
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

export default Testimonials;
