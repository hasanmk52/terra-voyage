import { notFound } from 'next/navigation'
import { shareGenerator } from '@/lib/share-generator'
import { format } from 'date-fns'
import { MapPin, Calendar, Users, DollarSign, Clock } from 'lucide-react'

interface SharedTripPageProps {
  params: Promise<{
    token: string
  }>
  searchParams: Promise<{
    password?: string
  }>
}

export default async function SharedTripPage({ 
  params, 
  searchParams 
}: SharedTripPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  
  try {
    const trip = await shareGenerator.getSharedTrip(
      resolvedParams.token,
      resolvedSearchParams.password
    )

    if (!trip) {
      notFound()
    }

    const startDate = format(new Date(trip.startDate), 'MMMM d, yyyy')
    const endDate = format(new Date(trip.endDate), 'MMMM d, yyyy')
    const duration = Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    )

    // Group activities by day
    const activitiesByDay = trip.activities.reduce((acc, activity) => {
      if (!activity.startTime) return acc
      
      const activityDate = new Date(activity.startTime)
      const tripStart = new Date(trip.startDate)
      const dayNumber = Math.floor(
        (activityDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
      
      if (!acc[dayNumber]) {
        acc[dayNumber] = []
      }
      acc[dayNumber].push(activity)
      return acc
    }, {} as Record<number, typeof trip.activities>)

    // Sort activities within each day
    Object.keys(activitiesByDay).forEach(day => {
      activitiesByDay[parseInt(day)].sort((a, b) => {
        if (!a.startTime || !b.startTime) return 0
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      })
    })

    const getActivityIcon = (type: string) => {
      const icons: Record<string, string> = {
        ACCOMMODATION: '🏨',
        TRANSPORTATION: '🚗',
        RESTAURANT: '🍽️',
        ATTRACTION: '🎯',
        EXPERIENCE: '🎪',
        SHOPPING: '🛍️',
        OTHER: '📌'
      }
      return icons[type] || '📌'
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {trip.title}
              </h1>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {startDate} - {endDate} ({duration} days)
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {trip.travelers} traveler{trip.travelers > 1 ? 's' : ''}
                </div>
                {trip.budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Budget: ${trip.budget.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Shared by: {trip.user.name || trip.user.email} • 
                Created with Terra Voyage
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Trip Description */}
          {trip.description && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Trip Overview
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {trip.description}
              </p>
            </div>
          )}

          {/* Daily Itinerary */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Daily Itinerary
            </h2>
            
            {Object.entries(activitiesByDay).map(([day, activities]) => {
              const dayDate = new Date(trip.startDate)
              dayDate.setDate(dayDate.getDate() + (parseInt(day) - 1))
              const formattedDate = format(dayDate, 'EEEE, MMMM d')

              return (
                <div key={day} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-blue-600 text-white px-6 py-4">
                    <h3 className="text-lg font-semibold">Day {day}</h3>
                    <p className="text-blue-100">{formattedDate}</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {activities.map((activity) => {
                      const startTime = activity.startTime 
                        ? format(new Date(activity.startTime), 'h:mm a')
                        : ''
                      const endTime = activity.endTime 
                        ? format(new Date(activity.endTime), 'h:mm a')
                        : ''
                      const timeRange = startTime && endTime 
                        ? `${startTime} - ${endTime}` 
                        : startTime

                      return (
                        <div key={activity.id} className="p-6 flex gap-4">
                          <div className="flex-shrink-0 w-20 text-right">
                            {timeRange && (
                              <div className="flex items-center gap-1 text-sm font-medium text-blue-600">
                                <Clock className="w-3 h-3" />
                                {timeRange}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">
                                {getActivityIcon(activity.type)}
                              </span>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {activity.name}
                              </h4>
                            </div>
                            
                            {activity.description && (
                              <p className="text-gray-700 mb-3">
                                {activity.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              {activity.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {activity.location}
                                </div>
                              )}
                              
                              {activity.price && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  ${activity.price.toLocaleString()} 
                                  {activity.currency && activity.currency !== 'USD' && 
                                    ` ${activity.currency}`
                                  }
                                </div>
                              )}
                            </div>
                            
                            {activity.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-700">
                                  <strong>Notes:</strong> {activity.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>This itinerary was created with Terra Voyage - AI-Powered Travel Planning</p>
            <p className="mt-1">Visit us at terraVoyage.com for more travel planning tools</p>
          </div>
        </div>
      </div>
    )

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Password required') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Password Required
              </h1>
              <p className="text-gray-600 mb-6">
                This shared itinerary is password protected. Please enter the password to view.
              </p>
              
              <form method="GET">
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Access Itinerary
                </button>
              </form>
            </div>
          </div>
        )
      }
      
      if (error.message === 'Invalid password') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Invalid Password
              </h1>
              <p className="text-gray-600 mb-6">
                The password you entered is incorrect. Please try again.
              </p>
              
              <form method="GET">
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </form>
            </div>
          </div>
        )
      }
    }

    console.error('Shared trip error:', error)
    notFound()
  }
}

export async function generateMetadata({ params }: SharedTripPageProps) {
  const resolvedParams = await params
  
  try {
    const trip = await shareGenerator.getSharedTrip(resolvedParams.token)
    
    if (!trip) {
      return {
        title: 'Shared Itinerary Not Found',
        description: 'The shared travel itinerary you are looking for could not be found.'
      }
    }

    return {
      title: `${trip.title} - Shared Travel Itinerary`,
      description: `View ${trip.destination} travel itinerary shared by ${trip.user.name || 'Terra Voyage user'}. ${trip.description || ''}`
    }
  } catch (error) {
    return {
      title: 'Shared Travel Itinerary',
      description: 'View a shared travel itinerary created with Terra Voyage.'
    }
  }
}