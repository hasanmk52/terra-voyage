"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  Users,
  DollarSign,
  ChevronRight,
  Star,
  Calendar,
} from "lucide-react";

interface SampleItinerary {
  id: string;
  destination: string;
  country: string;
  duration: number;
  budget: string;
  travelers: number;
  style: string;
  rating: number;
  image: string;
  highlights: string[];
  preview: {
    day: number;
    activities: {
      time: string;
      name: string;
      type: "attraction" | "restaurant" | "experience";
      description: string;
    }[];
  };
}

const sampleItineraries: SampleItinerary[] = [
  {
    id: "paris-romantic",
    destination: "Paris",
    country: "France",
    duration: 5,
    budget: "$1,200",
    travelers: 2,
    style: "Romantic",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop&crop=center",
    highlights: [
      "Eiffel Tower at sunset",
      "Seine river cruise",
      "Louvre Museum",
      "Montmartre district",
    ],
    preview: {
      day: 1,
      activities: [
        {
          time: "9:00 AM",
          name: "Eiffel Tower Visit",
          type: "attraction",
          description:
            "Start your romantic getaway with sunrise views from the iconic tower",
        },
        {
          time: "12:30 PM",
          name: "Café de Flore",
          type: "restaurant",
          description: "Classic Parisian lunch at this historic literary café",
        },
        {
          time: "3:00 PM",
          name: "Seine River Cruise",
          type: "experience",
          description: "Romantic boat cruise with champagne and city views",
        },
      ],
    },
  },
  {
    id: "tokyo-adventure",
    destination: "Tokyo",
    country: "Japan",
    duration: 7,
    budget: "$1,800",
    travelers: 1,
    style: "Adventure",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&crop=center",
    highlights: [
      "Shibuya crossing",
      "Traditional temples",
      "Robot restaurant",
      "Mount Fuji day trip",
    ],
    preview: {
      day: 2,
      activities: [
        {
          time: "8:00 AM",
          name: "Tsukiji Outer Market",
          type: "experience",
          description: "Fresh sushi breakfast and market exploration",
        },
        {
          time: "11:00 AM",
          name: "Senso-ji Temple",
          type: "attraction",
          description:
            "Ancient Buddhist temple in traditional Asakusa district",
        },
        {
          time: "2:00 PM",
          name: "Harajuku Street Food Tour",
          type: "restaurant",
          description: "Quirky neighborhood food adventure with local guide",
        },
      ],
    },
  },
  {
    id: "bali-family",
    destination: "Bali",
    country: "Indonesia",
    duration: 10,
    budget: "$2,500",
    travelers: 4,
    style: "Family",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop&crop=center",
    highlights: [
      "Rice terrace hikes",
      "Beach resorts",
      "Cultural workshops",
      "Wildlife sanctuary",
    ],
    preview: {
      day: 3,
      activities: [
        {
          time: "7:00 AM",
          name: "Tegallalang Rice Terraces",
          type: "attraction",
          description:
            "Family-friendly hike through stunning terraced landscapes",
        },
        {
          time: "12:00 PM",
          name: "Local Warung Lunch",
          type: "restaurant",
          description: "Authentic Indonesian family meal with kids menu",
        },
        {
          time: "3:30 PM",
          name: "Monkey Forest Sanctuary",
          type: "experience",
          description: "Interactive wildlife experience perfect for children",
        },
      ],
    },
  },
];

export function SampleItineraries() {
  const [selectedItinerary, setSelectedItinerary] = useState<string | null>(
    null
  );
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
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
            Inspiration from Real Itineraries
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            See how our AI creates personalized travel experiences for different
            styles, budgets, and group sizes
          </p>
        </motion.div>

        {/* Itinerary cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {sampleItineraries.map((itinerary, index) => (
            <motion.div
              key={itinerary.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              onHoverStart={() => setHoveredCard(itinerary.id)}
              onHoverEnd={() => setHoveredCard(null)}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
              onClick={() =>
                setSelectedItinerary(
                  selectedItinerary === itinerary.id ? null : itinerary.id
                )
              }
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                {!imageErrors.has(itinerary.id) ? (
                  <motion.img
                    src={itinerary.image}
                    alt={itinerary.destination}
                    className="w-full h-full object-cover"
                    animate={{ scale: hoveredCard === itinerary.id ? 1.1 : 1 }}
                    transition={{ duration: 0.3 }}
                    onError={(e) => {
                      // Fallback to a gradient background if image fails to load
                      const target = e.target as HTMLImageElement;
                      setImageErrors((prev) => new Set(prev).add(itinerary.id));
                      target.style.display = "none";
                      target.parentElement!.style.background =
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    <div className="text-white text-center">
                      <div className="text-3xl mb-2">
                        {itinerary.destination === "Paris"
                          ? "🗼"
                          : itinerary.destination === "Tokyo"
                          ? "🗾"
                          : itinerary.destination === "Bali"
                          ? "🌴"
                          : "🏛️"}
                      </div>
                      <div className="text-sm font-medium">
                        {itinerary.destination}
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-2xl font-bold">
                    {itinerary.destination}
                  </h3>
                  <p className="text-sm opacity-90">{itinerary.country}</p>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                  <span className="text-sm font-semibold">
                    {itinerary.rating}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Trip details */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {itinerary.duration} days
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {itinerary.travelers} traveler
                    {itinerary.travelers > 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {itinerary.budget}
                  </div>
                </div>

                {/* Style tag */}
                <div className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  {itinerary.style} Style
                </div>

                {/* Highlights */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Highlights:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {itinerary.highlights.slice(0, 2).map((highlight, i) => (
                      <span
                        key={i}
                        className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                      >
                        {highlight}
                      </span>
                    ))}
                    {itinerary.highlights.length > 2 && (
                      <span className="text-sm text-gray-500 dark:text-gray-500">
                        +{itinerary.highlights.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand button */}
                <motion.button
                  whileHover={{ x: 4 }}
                  className="flex items-center text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {selectedItinerary === itinerary.id ? "Hide" : "View"}{" "}
                  Day-by-Day Plan
                  <ChevronRight className="w-4 h-4 ml-1" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Expanded itinerary preview */}
        <AnimatePresence>
          {selectedItinerary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 overflow-hidden"
            >
              {(() => {
                const itinerary = sampleItineraries.find(
                  (i) => i.id === selectedItinerary
                );
                if (!itinerary) return null;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Day {itinerary.preview.day} in {itinerary.destination}
                      </h3>
                      <button
                        onClick={() => setSelectedItinerary(null)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-6">
                      {itinerary.preview.activities.map((activity, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-start space-x-4"
                        >
                          <div className="flex-shrink-0 w-20 text-right">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {activity.time}
                            </span>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-3 h-3 bg-blue-600 rounded-full mt-2" />
                            {index <
                              itinerary.preview.activities.length - 1 && (
                              <div className="w-0.5 h-16 bg-blue-200 dark:bg-blue-800 ml-1 mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-white mr-3">
                                {activity.name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  activity.type === "attraction"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                                    : activity.type === "restaurant"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                                }`}
                              >
                                {activity.type}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300">
                              {activity.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                        This is just a preview - our AI creates complete
                        day-by-day itineraries with maps, helpful tips, and
                        personalized recommendations.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Ready to create your own personalized itinerary?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-300"
          >
            Start Planning Your Trip
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

export default SampleItineraries;
