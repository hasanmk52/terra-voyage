"use client"

import { Search, MessageCircle, Book, Users, Zap, Clock } from "lucide-react"

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-6">
            Help Center
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Find answers to common questions and learn how to make the most of Terra Voyage.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Popular Topics</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Getting Started</h3>
              <p className="text-gray-600 mb-4">Learn the basics of creating your first trip with Terra Voyage.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• How to plan your first trip</li>
                <li>• Understanding the interface</li>
                <li>• Setting up preferences</li>
                <li>• Demo mode features</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Book className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Trip Planning</h3>
              <p className="text-gray-600 mb-4">Master the art of creating perfect itineraries.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Choosing destinations</li>
                <li>• Setting budgets effectively</li>
                <li>• Customizing preferences</li>
                <li>• Understanding AI suggestions</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Account & Settings</h3>
              <p className="text-gray-600 mb-4">Manage your account and customize your experience.</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Demo vs. full version</li>
                <li>• Privacy settings</li>
                <li>• Data management</li>
                <li>• Feature requests</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is Terra Voyage really free?</h3>
              <p className="text-gray-600">Yes! The current version is completely free as we're in beta. You can create unlimited trip plans and access all core features.</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How does the AI trip planning work?</h3>
              <p className="text-gray-600">Our AI analyzes your preferences, budget, and travel style to generate personalized itineraries. In demo mode, we use curated suggestions to show you how the system works.</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I modify the suggested itinerary?</h3>
              <p className="text-gray-600">Absolutely! You can customize every aspect of your itinerary, add or remove activities, adjust timing, and make it perfectly suited to your needs.</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Is my data safe?</h3>
              <p className="text-gray-600">Yes, we take privacy seriously. In demo mode, your data is stored locally on your device. We never sell your personal information.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <MessageCircle className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Still Need Help?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Contact Support
          </a>
        </div>
      </section>
    </div>
  )
}