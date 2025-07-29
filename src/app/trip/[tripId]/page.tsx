"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ItineraryDisplay } from '@/components/itinerary/itinerary-display'
import { WeatherSidebar } from '@/components/weather/weather-sidebar'
// import { ExportButton } from '@/components/export-button'
import { Day } from '@/lib/itinerary-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  ArrowLeft,
  Cloud,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface TripData {
  id: string
  title: string
  destination: {
    name: string
    coordinates: { lat: number; lng: number }
  }
  startDate: string
  endDate: string
  travelers: {
    adults: number
    children: number
    infants: number
  }
  budget: {
    amount: number
    currency: string
  }
  days: Day[]
  status: string
}

export default function TripDetailsPage() {
  const params = useParams()
  const tripId = params.tripId as string
  
  const [trip, setTrip] = useState<TripData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWeather, setShowWeather] = useState(true)

  // Mock trip data for demonstration
  useEffect(() => {
    const loadTrip = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock trip data
        const mockTrip: TripData = {
          id: tripId,
          title: "Amazing Paris Adventure",
          destination: {
            name: "Paris, France",
            coordinates: { lat: 48.8566, lng: 2.3522 }
          },
          startDate: "2025-08-15",
          endDate: "2025-08-20",
          travelers: {
            adults: 2,
            children: 0,
            infants: 0
          },
          budget: {
            amount: 2500,
            currency: "USD"
          },
          days: [
            {
              day: 1,
              date: "2025-08-15",
              activities: [
                {
                  id: "activity-1",
                  name: "Arrive at Charles de Gaulle Airport",
                  description: "Flight arrival and transfer to hotel",
                  location: "Charles de Gaulle Airport",
                  startTime: "09:00",
                  endTime: "11:00",
                  duration: "120 minutes",
                  type: "transportation",
                  timeSlot: "morning",
                  pricing: { amount: 0, currency: "USD", priceType: "free" },
                  bookingUrl: null,
                  notes: "Check flight status before departure"
                },
                {
                  id: "activity-2", 
                  name: "Check-in at Hotel",
                  description: "Hotel check-in and rest",
                  location: "Hotel des Grands Boulevards",
                  startTime: "14:00",
                  endTime: "15:00",
                  duration: "60 minutes",
                  type: "accommodation",
                  timeSlot: "afternoon",
                  pricing: { amount: 150, currency: "USD", priceType: "per_group" },
                  bookingUrl: null,
                  notes: "Early check-in available"
                },
                {
                  id: "activity-3",
                  name: "Evening Stroll along Seine",
                  description: "Romantic walk along the Seine River",
                  location: "Seine River",
                  startTime: "18:00",
                  endTime: "20:00", 
                  duration: "120 minutes",
                  type: "attraction",
                  timeSlot: "evening",
                  pricing: { amount: 0, currency: "USD", priceType: "free" },
                  bookingUrl: null,
                  notes: "Perfect for sunset photos"
                }
              ]
            },
            {
              day: 2,
              date: "2025-08-16",
              activities: [
                {
                  id: "activity-4",
                  name: "Visit the Louvre Museum",
                  description: "Explore the world's largest art museum",
                  location: "Louvre Museum",
                  startTime: "09:00",
                  endTime: "13:00",
                  duration: "240 minutes",
                  type: "attraction",
                  timeSlot: "morning",
                  pricing: { amount: 17, currency: "USD", priceType: "per_person" },
                  bookingUrl: null,
                  notes: "Book tickets online to skip the line"
                },
                {
                  id: "activity-5",
                  name: "Lunch at Café de Flore",
                  description: "Historic café in Saint-Germain",
                  location: "172 Boulevard Saint-Germain",
                  startTime: "13:30",
                  endTime: "15:00",
                  duration: "90 minutes",
                  type: "restaurant",
                  timeSlot: "afternoon",
                  pricing: { amount: 45, currency: "USD", priceType: "per_person" },
                  bookingUrl: null,
                  notes: "Famous for its literary history"
                },
                {
                  id: "activity-6",
                  name: "Climb the Eiffel Tower",
                  description: "Iconic tower with panoramic city views",
                  location: "Eiffel Tower",
                  startTime: "16:00",
                  endTime: "18:00",
                  duration: "120 minutes",
                  type: "attraction",
                  timeSlot: "afternoon",
                  pricing: { amount: 25, currency: "USD", priceType: "per_person" },
                  bookingUrl: null,
                  notes: "Best views at sunset"
                }
              ]
            }
          ],
          status: "planned"
        }
        
        setTrip(mockTrip)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trip')
      } finally {
        setIsLoading(false)
      }
    }

    loadTrip()
  }, [tripId])

  const handleUpdateDays = (updatedDays: Day[]) => {
    if (trip) {
      setTrip({ ...trip, days: updatedDays })
    }
  }

  const handleSaveTrip = async () => {
    // Mock save functionality
    console.log('Saving trip...', trip)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your trip details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Trip not found'}</p>
            <Button asChild>
              <Link href="/plan">Plan a New Trip</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalTravelers = trip.travelers.adults + trip.travelers.children + trip.travelers.infants
  const tripDuration = trip.days.length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowWeather(!showWeather)}
                className="flex items-center gap-2"
              >
                <Cloud className="h-4 w-4" />
                {showWeather ? 'Hide Weather' : `Weather for ${trip.destination.name}`}
              </Button>
              {/* <ExportButton tripId={trip.id} /> */}
              <Button variant="outline">Export Trip</Button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.title}</h1>
                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.destination.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{totalTravelers} traveler{totalTravelers > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>{trip.budget.amount} {trip.budget.currency}</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <Badge variant="secondary" className="mb-2">
                  {tripDuration} day{tripDuration > 1 ? 's' : ''}
                </Badge>
                <div className="text-sm text-gray-500">
                  Status: <span className="capitalize font-medium">{trip.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <ItineraryDisplay
              days={trip.days}
              onUpdateDays={handleUpdateDays}
              onSave={handleSaveTrip}
              isLoading={false}
              isDirty={false}
            />
          </div>

          {/* Sidebar with Weather */}
          <div className="lg:col-span-1">
            {showWeather && (
              <div className="sticky top-8">
                <WeatherSidebar
                  days={trip.days}
                  destination={trip.destination}
                  startDate={trip.startDate}
                  endDate={trip.endDate}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}