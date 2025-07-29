"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  AlertCircle
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'

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

  const handleViewTrip = (tripId: string) => {
    router.push(`/trip/${tripId}`)
  }

  const handleCreateTrip = () => {
    router.push('/plan')
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
              <Card key={index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-20" />
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
                <Card key={trip.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {trip.title}
                      </CardTitle>
                      <Badge className={getStatusColor(trip.status)}>
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="line-clamp-1">{trip.destination}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
                      </div>
                      {trip.budget && (
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          <span>${trip.budget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {trip.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {trip.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-gray-500">
                        Created {new Date(trip.createdAt).toLocaleDateString()}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleViewTrip(trip.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
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