"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ItineraryDisplay } from '@/components/itinerary/itinerary-display'
import { WeatherSidebar } from '@/components/weather/weather-sidebar'
import { TravelMap } from '@/components/maps/travel-map'
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

// Helper function to transform API days data to UI format
function transformApiDaysToUiFormat(apiDays: any[]): Day[] {
  return apiDays.map(day => ({
    day: day.dayNumber,
    date: day.date,
    transportation: day.transportation,
    dailyBudget: day.dailyBudget,
    theme: day.theme || `Day ${day.dayNumber}`,
    activities: day.activities.map((activity: any) => ({
      id: activity.id,
      name: activity.name,
      description: activity.description || '',
      location: {
        name: activity.location || activity.name,
        address: activity.address || '',
        coordinates: activity.coordinates || { lat: 0, lng: 0 }
      },
      startTime: activity.startTime || '09:00',
      endTime: activity.endTime || '11:00',
      duration: activity.duration || '120 minutes',
      type: activity.type?.toLowerCase() || 'attraction',
      price: {
        amount: activity.price || 0,
        currency: activity.currency || 'USD'
      },
      isBooked: activity.bookingStatus === 'CONFIRMED',
      notes: activity.notes || '',
      bookingUrl: activity.bookingUrl || undefined,
      timeSlot: activity.timeSlot || 'morning',
      pricing: {
        amount: activity.price || 0,
        currency: activity.currency || 'USD',
        priceType: activity.priceType || 'per_person'
      },
      tips: Array.isArray(activity.tips) ? activity.tips : [],
      bookingRequired: activity.bookingRequired || false,
      accessibility: activity.accessibility || {
        wheelchairAccessible: true,
        hasElevator: false,
        notes: 'Contact venue for accessibility information'
      }
    }))
  }))
}

// Helper function to generate mock itinerary based on destination and dates
function generateMockItinerary(destination: string, startDate: string, endDate: string, baseCoords?: { lat: number; lng: number }): Day[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  // Use provided coordinates or default to Paris
  const coords = baseCoords || { lat: 48.8566, lng: 2.3522 }
  
  const days: Day[] = []
  
  for (let i = 0; i < dayCount; i++) {
    const currentDate = new Date(start)
    currentDate.setDate(start.getDate() + i)
    
    days.push({
      day: i + 1,
      date: currentDate.toISOString().split('T')[0],
      transportation: { primaryMethod: 'walking' as const, estimatedCost: 0, notes: '' },
      dailyBudget: { amount: 100, currency: 'USD' },
      theme: `Day ${i + 1} in ${destination}`,
      activities: [
        {
          id: `activity-${i + 1}-1`,
          name: i === 0 ? "Arrival and Check-in" : `Explore ${destination}`,
          description: i === 0 ? "Arrive at destination and settle in" : `Discover the best of ${destination}`,
          location: {
            name: destination,
            address: `${destination} City Center`,
            coordinates: { lat: coords.lat + (Math.random() - 0.5) * 0.01, lng: coords.lng + (Math.random() - 0.5) * 0.01 }
          },
          startTime: "09:00",
          endTime: "12:00",
          duration: "180 minutes",
          type: i === 0 ? "accommodation" : "attraction",
          price: {
            amount: 0,
            currency: "USD"
          },
          isBooked: false,
          notes: `Generated activity for ${destination}`,
          bookingUrl: undefined,
          timeSlot: "morning",
          pricing: {
            amount: 0,
            currency: "USD",
            priceType: "free"
          },
          tips: [],
          bookingRequired: false,
          accessibility: {
            wheelchairAccessible: true,
            hasElevator: false,
            notes: 'Contact venue for accessibility information'
          }
        },
        {
          id: `activity-${i + 1}-2`,
          name: `Lunch at Local Restaurant`,
          description: `Enjoy local cuisine in ${destination}`,
          location: {
            name: `${destination} Restaurant`,
            address: `${destination} Downtown`,
            coordinates: { lat: coords.lat + (Math.random() - 0.5) * 0.01, lng: coords.lng + (Math.random() - 0.5) * 0.01 }
          },
          startTime: "13:00",
          endTime: "14:30",
          duration: "90 minutes",
          type: "restaurant",
          price: {
            amount: 35,
            currency: "USD"
          },
          isBooked: false,
          notes: "Local cuisine experience",
          bookingUrl: undefined,
          timeSlot: "afternoon",
          pricing: {
            amount: 35,
            currency: "USD",
            priceType: "per_person"
          },
          tips: [],
          bookingRequired: false,
          accessibility: {
            wheelchairAccessible: true,
            hasElevator: false,
            notes: 'Contact venue for accessibility information'
          }
        }
      ]
    })
  }
  
  return days
}

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
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined)
  const [showMap, setShowMap] = useState(true)

  // Load trip data from API or use mock data
  useEffect(() => {
    const loadTrip = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Try to fetch from API first
        try {
          const response = await fetch(`/api/user/trips/${tripId}`)
          if (response.ok) {
            const data = await response.json()
            
            // Transform API response to match our TripData interface
            const apiTrip: TripData = {
              id: data.trip.id,
              title: data.trip.title,
              destination: {
                name: data.trip.destination,
                coordinates: data.trip.destinationCoords || { lat: 48.8566, lng: 2.3522 } // Use actual coords or fallback to Paris
              },
              startDate: data.trip.startDate.split('T')[0],
              endDate: data.trip.endDate.split('T')[0],
              travelers: {
                adults: data.trip.travelers || 2,
                children: 0,
                infants: 0
              },
              budget: {
                amount: data.trip.budget || 2000,
                currency: "USD"
              },
              // Use REAL itinerary data from API if available, otherwise fallback to generated mock
              days: data.trip.days && data.trip.days.length > 0 
                ? transformApiDaysToUiFormat(data.trip.days)
                : generateMockItinerary(data.trip.destination, data.trip.startDate, data.trip.endDate, data.trip.destinationCoords),
              status: data.trip.status || "PLANNED"
            }
            
            setTrip(apiTrip)
            setIsLoading(false)
            return
          }
        } catch (apiError) {
          console.log("API fetch failed, using mock data:", apiError)
        }
        
        // Fallback to mock data
        await new Promise(resolve => setTimeout(resolve, 500))
        
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
                  location: {
                    name: "Charles de Gaulle Airport",
                    address: "95700 Roissy-en-France, France",
                    coordinates: { lat: 49.0097, lng: 2.5479 }
                  },
                  startTime: "09:00",
                  endTime: "11:00",
                  duration: "120 minutes",
                  type: "transportation",
                  timeSlot: "morning",
                  pricing: { amount: 0, currency: "USD", priceType: "free" },
                  tips: ["Check flight status online", "Arrive early for customs"],
                  bookingRequired: false,
                  accessibility: {
                    wheelchairAccessible: true,
                    hasElevator: true,
                    notes: "Wheelchair accessible"
                  },
                  bookingUrl: undefined,
                },
                {
                  id: "activity-2", 
                  name: "Check-in at Hotel",
                  description: "Hotel check-in and rest",
                  location: {
                    name: "Hotel des Grands Boulevards",
                    address: "17 Boulevard Poissonnière, 75002 Paris, France",
                    coordinates: { lat: 48.8708, lng: 2.3439 }
                  },
                  startTime: "14:00",
                  endTime: "15:00",
                  duration: "60 minutes",
                  type: "accommodation",
                  timeSlot: "afternoon",
                  pricing: { amount: 150, currency: "USD", priceType: "per_group" },
                  tips: ["Request early check-in", "Ask for room upgrade"],
                  bookingRequired: true,
                  accessibility: {
                    wheelchairAccessible: true,
                    hasElevator: true,
                    notes: "Accessible rooms available"
                  },
                  bookingUrl: undefined,
                },
                {
                  id: "activity-3",
                  name: "Evening Stroll along Seine",
                  description: "Romantic walk along the Seine River",
                  location: {
                    name: "Seine River",
                    address: "Seine River, Paris, France",
                    coordinates: { lat: 48.8566, lng: 2.3522 }
                  },
                  startTime: "18:00",
                  endTime: "20:00", 
                  duration: "120 minutes",
                  type: "attraction",
                  timeSlot: "evening",
                  pricing: { amount: 0, currency: "USD", priceType: "free" },
                  tips: ["Perfect for sunset photos", "Bring a jacket"],
                  bookingRequired: false,
                  accessibility: {
                    wheelchairAccessible: true,
                    hasElevator: false,
                    notes: "Some areas may be difficult to access"
                  },
                  bookingUrl: undefined,
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
                  location: {
                    name: "Louvre Museum",
                    address: "Rue de Rivoli, 75001 Paris, France",
                    coordinates: { lat: 48.8606, lng: 2.3376 }
                  },
                  startTime: "09:00",
                  endTime: "13:00",
                  duration: "240 minutes",
                  type: "attraction",
                  timeSlot: "morning",
                  pricing: { amount: 17, currency: "USD", priceType: "per_person" },
                  tips: ["Book tickets online", "Visit Mona Lisa early", "Allow 4+ hours"],
                  bookingRequired: true,
                  accessibility: {
                    wheelchairAccessible: true,
                    hasElevator: true,
                    notes: "Fully accessible with ramps and lifts"
                  },
                  bookingUrl: undefined,
                },
                {
                  id: "activity-5",
                  name: "Lunch at Café de Flore",
                  description: "Historic café in Saint-Germain",
                  location: {
                    name: "Café de Flore",
                    address: "172 Boulevard Saint-Germain, 75006 Paris, France",
                    coordinates: { lat: 48.8542, lng: 2.3320 }
                  },
                  startTime: "13:30",
                  endTime: "15:00",
                  duration: "90 minutes",
                  type: "restaurant",
                  timeSlot: "afternoon",
                  pricing: { amount: 45, currency: "USD", priceType: "per_person" },
                  tips: ["Famous for literary history", "Try the hot chocolate", "Can be crowded"],
                  bookingRequired: false,
                  accessibility: {
                    wheelchairAccessible: false,
                    hasElevator: false,
                    notes: "Historic café with steps"
                  },
                  bookingUrl: undefined,
                },
                {
                  id: "activity-6",
                  name: "Climb the Eiffel Tower",
                  description: "Iconic tower with panoramic city views",
                  location: {
                    name: "Eiffel Tower",
                    address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
                    coordinates: { lat: 48.8584, lng: 2.2945 }
                  },
                  startTime: "16:00",
                  endTime: "18:00",
                  duration: "120 minutes",
                  type: "attraction",
                  timeSlot: "afternoon",
                  pricing: { amount: 25, currency: "USD", priceType: "per_person" },
                  tips: ["Best views at sunset", "Book skip-the-line tickets", "Bring a camera"],
                  bookingRequired: true,
                  accessibility: {
                    wheelchairAccessible: true,
                    hasElevator: true,
                    notes: "Elevator access to 2nd floor only"
                  },
                  bookingUrl: undefined,
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
          <div className="lg:col-span-3 space-y-8">
            {/* Map Section */}
            {showMap && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Trip Map</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMap(false)}
                    >
                      Hide Map
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-lg overflow-hidden">
                    <TravelMap
                      days={trip.days}
                      destinationCoords={trip.destination.coordinates}
                      selectedDay={selectedDay}
                      onDaySelect={setSelectedDay}
                      showRoutes={true}
                      transportMode="walking"
                      mapStyle="streets"
                      enableClustering={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!showMap && (
              <div className="text-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Show Map
                </Button>
              </div>
            )}
            
            {/* Itinerary Section */}
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