"use client"

import { Compass, Map, DollarSign, Shield, Clock, Heart } from "lucide-react"

export default function TipsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-6">
            Travel Tips & Guides
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Expert advice and insider tips to make your travels more enjoyable, safe, and memorable.
          </p>
        </div>
      </section>

      {/* Tips Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Planning Tips */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Compass className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Planning Essentials</h3>
              <ul className="space-y-3 text-gray-600">
                <li>• Book flights 6-8 weeks in advance</li>
                <li>• Research visa requirements early</li>
                <li>• Check passport expiration dates</li>
                <li>• Consider travel insurance</li>
                <li>• Download offline maps</li>
                <li>• Notify banks of travel plans</li>
              </ul>
            </div>

            {/* Budget Tips */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Budget Smart</h3>
              <ul className="space-y-3 text-gray-600">
                <li>• Travel during shoulder seasons</li>
                <li>• Use public transportation</li>
                <li>• Stay in local neighborhoods</li>
                <li>• Eat where locals eat</li>
                <li>• Book accommodations with kitchens</li>
                <li>• Look for free walking tours</li>
              </ul>
            </div>

            {/* Safety Tips */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Stay Safe</h3>
              <ul className="space-y-3 text-gray-600">
                <li>• Share itinerary with family</li>
                <li>• Keep copies of important documents</li>
                <li>• Research local emergency numbers</li>
                <li>• Trust your instincts</li>
                <li>• Avoid displaying expensive items</li>
                <li>• Know common local scams</li>
              </ul>
            </div>

            {/* Packing Tips */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Map className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Pack Right</h3>
              <ul className="space-y-3 text-gray-600">
                <li>• Pack versatile, mix-and-match clothes</li>
                <li>• Roll clothes to save space</li>
                <li>• Bring a portable charger</li>
                <li>• Pack medications in carry-on</li>
                <li>• Leave room for souvenirs</li>
                <li>• Bring comfortable walking shoes</li>
              </ul>
            </div>

            {/* Time Management */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Time Wisely</h3>
              <ul className="space-y-3 text-gray-600">
                <li>• Don't over-schedule your days</li>
                <li>• Account for travel time between places</li>
                <li>• Book popular attractions in advance</li>
                <li>• Visit major sights early morning</li>
                <li>• Allow buffer time for delays</li>
                <li>• Plan rest days for longer trips</li>
              </ul>
            </div>

            {/* Cultural Tips */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Cultural Respect</h3>
              <ul className="space-y-3 text-gray-600">
                <li>• Learn basic local phrases</li>
                <li>• Research cultural norms</li>
                <li>• Dress appropriately for locations</li>
                <li>• Be mindful of photography rules</li>
                <li>• Tip according to local customs</li>
                <li>• Show appreciation for local culture</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Article */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Travel Guide</h2>
            <p className="text-lg text-gray-600">Essential tips for first-time international travelers</p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Your First International Trip: A Complete Guide</h3>
            
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                Planning your first international trip can feel overwhelming, but with the right preparation, 
                it can be one of the most rewarding experiences of your life. Here's everything you need to know.
              </p>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Before You Go:</h4>
                <p>
                  Start planning at least 2-3 months before your trip. Research your destination's culture, 
                  weather patterns, and any travel advisories. Make sure your passport is valid for at least 
                  6 months beyond your travel dates.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">During Your Trip:</h4>
                <p>
                  Stay flexible with your plans, keep important documents secure, and don't be afraid to 
                  step out of your comfort zone. Some of the best travel experiences come from unexpected 
                  discoveries and conversations with locals.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">After You Return:</h4>
                <p>
                  Take time to reflect on your experience, organize your photos, and start planning your 
                  next adventure. International travel has a way of opening your mind to new possibilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Plan Your Next Adventure?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Use these tips while planning your trip with Terra Voyage's AI-powered itinerary generator.
          </p>
          <a
            href="/plan"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Start Planning Your Trip
          </a>
        </div>
      </section>
    </div>
  )
}