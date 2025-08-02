"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  Plus,
  Eye,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface Trip {
  id: string
  title: string
  destination: string
  description?: string
  startDate: string
  endDate: string
  budget?: number
  travelers: number
  status: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    activities: number
    collaborations: number
  }
}

interface TripsResponse {
  trips: Trip[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function TripsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1
  })

  const loadTrips = async (pageNum: number = 1) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response: TripsResponse = await apiClient.getTrips({ 
        page: pageNum, 
        limit: 12 
      })
      
      setTrips(response.trips)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Failed to load trips:', error)
      setError('Failed to load trips. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTrips(page)
  }, [page])

  // Preload next page for better UX
  useEffect(() => {
    if (trips.length > 0 && page < pagination.pages) {
      const timer = setTimeout(() => {
        // Prefetch next page in background
        apiClient.getTrips({ page: page + 1, limit: 12 }).catch(() => {
          // Silently fail prefetch
        })
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [trips, page, pagination.pages])

  const handleViewTrip = (tripId: string) => {
    router.push(`/trip/${tripId}`)
  }

  const handleCreateTrip = () => {
    router.push('/plan')
  }

  const handleDeleteTrip = async (tripId: string, tripTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${tripTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeletingTripId(tripId)
    
    try {
      await apiClient.deleteTrip(tripId)
      
      // Remove trip from local state
      setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId))
      
      // Update pagination if needed
      const newTotal = pagination.total - 1
      const newPages = Math.ceil(newTotal / pagination.limit)
      setPagination(prev => ({
        ...prev,
        total: newTotal,
        pages: newPages
      }))
      
      // If current page becomes empty and not the first page, go to previous page
      if (trips.length === 1 && page > 1) {
        setPage(page - 1)
      }
      
    } catch (error) {
      console.error('Failed to delete trip:', error)
      alert('Failed to delete trip. Please try again.')
    } finally {
      setDeletingTripId(null)
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    const endFormatted = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`
    }
    
    return `${startFormatted} - ${endFormatted}`
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Trips</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => loadTrips(page)} className="mr-4">
              Try Again
            </Button>
            <Button variant="outline" onClick={handleCreateTrip}>
              Create New Trip
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Trips</h1>
            <p className="text-gray-600 mt-2">
              Manage and view all your travel plans
            </p>
          </div>
          <Button onClick={handleCreateTrip} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Trip
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="overflow-hidden animate-pulse">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4 mr-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-1" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 mb-0">
                    <Skeleton className="h-3 w-20" />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-7 w-14 rounded-lg" />
                      <Skeleton className="h-7 w-16 rounded-lg" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && trips.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">
              Start planning your next adventure by creating your first trip.
            </p>
            <Button onClick={handleCreateTrip} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Your First Trip
            </Button>
          </div>
        )}

        {/* Trips Grid */}
        {!isLoading && trips.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {trips.map((trip) => (
                <Card key={trip.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 hover:border-blue-200 bg-white">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <CardTitle className="text-lg font-semibold line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {trip.title}
                      </CardTitle>
                      <Badge className={`${getStatusColor(trip.status)} px-2 py-1 rounded-full text-xs font-medium`}>
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="line-clamp-1 font-medium">{trip.destination}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium">{formatDateRange(trip.startDate, trip.endDate)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-green-500" />
                          <span>{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
                        </div>
                        {trip.budget && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-emerald-500" />
                            <span className="font-semibold text-gray-700">${trip.budget.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {trip.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {trip.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 mb-0">
                      <div className="text-xs text-gray-500">
                        Created {new Date(trip.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewTrip(trip.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTrip(trip.id, trip.title)
                          }}
                          disabled={deletingTripId === trip.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-red-200 text-red-600 bg-white rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          {deletingTripId === trip.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          {deletingTripId === trip.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center space-x-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}