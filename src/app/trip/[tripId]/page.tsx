"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ItineraryDisplay } from '@/components/itinerary/itinerary-display'
import { WeatherSidebar } from '@/components/weather/weather-sidebar'
import { TravelMap } from '@/components/maps/travel-map'
import { Day } from '@/lib/itinerary-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusManager } from '@/components/trip/status-manager'
import { StatusHistory } from '@/components/trip/status-history'
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  ArrowLeft,
  Cloud,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { TripStatus } from '@prisma/client'

// Helper function to transform API days data to UI format
function transformApiDaysToUiFormat(apiDays: any[], tripCurrency: string = 'USD'): Day[] {
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
        currency: activity.currency || tripCurrency
      },
      isBooked: activity.bookingStatus === 'CONFIRMED',
      notes: activity.notes || '',
      bookingUrl: activity.bookingUrl || undefined,
      timeSlot: activity.timeSlot || 'morning',
      pricing: {
        amount: activity.price || 0,
        currency: activity.currency || tripCurrency,
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
function generateMockItinerary(destination: string, startDate: string, endDate: string, currency: string = 'USD', baseCoords?: { lat: number; lng: number }): Day[] {
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
      dailyBudget: { amount: 100, currency: currency },
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
          pricing: {
            amount: 0,
            currency: currency,
            priceType: "free" as const
          },
          notes: `Generated activity for ${destination}`,
          bookingUrl: undefined,
          timeSlot: "morning",
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
          pricing: {
            amount: 35,
            currency: currency,
            priceType: "per_person" as const
          },
          notes: "Local cuisine experience",
          bookingUrl: undefined,
          timeSlot: "afternoon",
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
  const tripId = params?.tripId as string
  
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
                currency: data.trip.currency || "USD"
              },
              // Use REAL itinerary data from API if available, otherwise fallback to generated mock
              days: data.trip.days && data.trip.days.length > 0 
                ? transformApiDaysToUiFormat(data.trip.days, data.trip.currency || 'USD')
                : data.trip.itineraryData && data.trip.itineraryData.rawData?.itinerary?.days
                ? transformApiDaysToUiFormat(data.trip.itineraryData.rawData.itinerary.days.map((day: any, index: number) => ({
                    dayNumber: day.day || (index + 1),
                    date: day.date || new Date(new Date(data.trip.startDate).getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    theme: day.theme || `Day ${day.day || (index + 1)}`,
                    transportation: day.transportation,
                    dailyBudget: day.dailyBudget,
                    activities: day.activities || []
                  })), data.trip.currency || 'USD')
                : generateMockItinerary(data.trip.destination, data.trip.startDate, data.trip.endDate, data.trip.currency || 'USD', data.trip.destinationCoords),
              status: data.trip.status || "PLANNED"
            }
            
            setTrip(apiTrip)
            setIsLoading(false)
            return
          }
        } catch (apiError) {
          console.error('Failed to load trip from API:', apiError)
          
          // Set user-friendly error message based on the error type
          if (apiError instanceof Error) {
            if (apiError.message.includes('404') || apiError.message.includes('not found')) {
              setError('Trip not found. This trip may have been deleted or the link is incorrect.')
            } else if (apiError.message.includes('timeout') || apiError.message.includes('network')) {
              setError('Unable to connect to our servers. Please check your internet connection and try again.')
            } else if (apiError.message.includes('AI') || apiError.message.includes('generation')) {
              setError('Your trip is being processed. Please try refreshing in a few moments.')
            } else {
              setError('We encountered an issue loading your trip. Please try again or contact support if the problem persists.')
            }
          } else {
            setError('We encountered an unexpected issue. Please try again or contact support.')
          }
        }
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
    // TODO: Implement actual save functionality
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
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                {error?.includes('not found') ? (
                  <div className="text-red-500 mb-4">
                    <MapPin className="h-12 w-12 mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Trip Not Found</h2>
                  </div>
                ) : error?.includes('processed') ? (
                  <div className="text-yellow-500 mb-4">
                    <RefreshCw className="h-12 w-12 mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Trip Being Generated</h2>
                  </div>
                ) : error?.includes('connection') || error?.includes('network') ? (
                  <div className="text-orange-500 mb-4">
                    <Cloud className="h-12 w-12 mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Connection Issue</h2>
                  </div>
                ) : (
                  <div className="text-red-500 mb-4">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3" />
                    <h2 className="text-xl font-semibold mb-2">Something Went Wrong</h2>
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                {error || 'We couldn\'t load your trip details. Please try again or create a new trip.'}
              </p>
              
              <div className="space-y-3">
                {error?.includes('processed') ? (
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Page
                  </Button>
                ) : error?.includes('connection') || error?.includes('network') ? (
                  <>
                    <Button 
                      onClick={() => window.location.reload()} 
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/plan" className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Plan a New Trip
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full">
                      <Link href="/plan" className="flex items-center justify-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Plan a New Trip
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/" className="flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
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
                    <div className="flex flex-col">
                      <span className="font-semibold">{trip.budget.amount} {trip.budget.currency} total</span>
                      {totalTravelers > 1 && (
                        <span className="text-xs text-gray-500">
                          ~{Math.round(trip.budget.amount / totalTravelers)} {trip.budget.currency}/person
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end gap-3">
                <Badge variant="secondary" className="mb-1">
                  {tripDuration} day{tripDuration > 1 ? 's' : ''}
                </Badge>
                
                {/* Status Management Section */}
                <div className="flex items-center gap-3">
                  <StatusManager
                    tripId={trip.id}
                    currentStatus={trip.status as TripStatus}
                    onStatusChange={(newStatus) => {
                      // Update the trip status in state
                      setTrip(prev => prev ? { ...prev, status: newStatus } : null)
                    }}
                    showLabel={false}
                  />
                </div>
                
                {/* Status History Button */}
                <StatusHistory 
                  tripId={trip.id}
                  className="text-xs"
                />
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