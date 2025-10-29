"use client"

import { 
  Brain, 
  Map, 
  Clock, 
  Calendar, 
  Download, 
  Cloud, 
  Smartphone, 
  Users, 
  Star, 
  Zap,
  MapPin,
  FileText,
  Shield,
  Palette,
  Globe,
  Heart
} from "lucide-react"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Powerful Features
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Discover the advanced capabilities that make Terra Voyage the most intelligent and user-friendly 
            travel planning platform available.
          </p>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">AI-Powered Intelligence</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our advanced AI understands your preferences and creates perfect itineraries tailored just for you
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-300">
                <Brain className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Recommendations</h3>
              <p className="text-gray-600">
                AI analyzes millions of travel data points to suggest activities perfectly matched to your interests and travel style.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:from-purple-500 group-hover:to-purple-600 transition-all duration-300">
                <Clock className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Itineraries</h3>
              <p className="text-gray-600">
                Generate complete multi-day travel plans in under 30 seconds. No more hours of research and planning.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:from-green-500 group-hover:to-green-600 transition-all duration-300">
                <Heart className="w-6 h-6 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Personalized Experiences</h3>
              <p className="text-gray-600">
                Every recommendation is tailored to your budget, interests, travel pace, and dietary preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planning Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Planning Tools</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to plan, organize, and execute the perfect trip
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">Interactive Maps</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Visualize your entire trip on beautiful interactive maps. See optimal routes between destinations, 
                nearby attractions, and get real-time navigation assistance.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Route optimization for minimal travel time
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Clustered activity markers
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  Multiple transportation options
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 text-center">
              <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <div className="text-2xl font-bold text-gray-900 mb-2">Interactive Mapping</div>
              <div className="text-gray-600">See your journey come to life</div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div className="bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl p-8 text-center md:order-1">
              <Calendar className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <div className="text-2xl font-bold text-gray-900 mb-2">Smart Scheduling</div>
              <div className="text-gray-600">Perfect timing for every activity</div>
            </div>
            <div className="md:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">Intelligent Scheduling</h3>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Our AI considers opening hours, travel times, crowd patterns, and weather to create the perfect 
                daily schedule that maximizes your experience.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Weather-aware activity suggestions
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Opening hours and crowd optimization
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  Flexible timing adjustments
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Export & Sharing Features */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Export & Share</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Take your itinerary anywhere and share your adventures with others
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center group-hover:from-red-500 group-hover:to-red-600 transition-all duration-300">
                <Download className="w-6 h-6 text-red-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Calendar Export</h3>
              <p className="text-sm text-gray-600">Sync your itinerary to your favorite calendar in one click</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-300">
                <Calendar className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Calendar Sync</h3>
              <p className="text-sm text-gray-600">Export to Google Calendar, Outlook, and Apple Calendar</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:from-purple-500 group-hover:to-purple-600 transition-all duration-300">
                <Smartphone className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mobile Ready</h3>
              <p className="text-sm text-gray-600">Access your itinerary on any device, anywhere</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:from-green-500 group-hover:to-green-600 transition-all duration-300">
                <Cloud className="w-6 h-6 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Cloud Storage</h3>
              <p className="text-sm text-gray-600">Your trips are safely stored and synced across devices</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Advanced Capabilities</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional-grade features for the modern traveler
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Private</h3>
              <p className="text-gray-600">
                Your travel data is encrypted and secure. No authentication required - your privacy is protected.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl p-6 border border-teal-100">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Coverage</h3>
              <p className="text-gray-600">
                Plan trips to any destination worldwide with localized recommendations and cultural insights.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Beautiful Design</h3>
              <p className="text-gray-600">
                Modern, intuitive interface with stunning visuals that make planning a joy, not a chore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Experience the Future of Travel Planning</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Try all these powerful features today and discover why thousands of travelers choose Terra Voyage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/plan"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Start Planning Now
            </a>
            <a
              href="/about"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-all duration-200"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
