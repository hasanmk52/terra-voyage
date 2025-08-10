"use client"

import { useState, useEffect } from 'react'
import { TripStatus } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from './status-badge'
import { apiClient } from '@/lib/api-client'
import { 
  History, 
  User, 
  Bot, 
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface StatusHistoryEntry {
  id: string
  tripId: string
  oldStatus: TripStatus | null
  newStatus: TripStatus
  reason: string
  timestamp: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  } | null
  metadata: any
  isAutomatic: boolean
  isManual: boolean
  description: string
}

interface StatusHistoryData {
  trip: {
    id: string
    title: string
    currentStatus: TripStatus
  }
  statusHistory: StatusHistoryEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  summary: {
    totalChanges: number
    automaticChanges: number
    manualChanges: number
  }
}

interface StatusHistoryProps {
  tripId: string
  children?: React.ReactNode
  className?: string
}

export function StatusHistory({ tripId, children, className }: StatusHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StatusHistoryData | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const loadStatusHistory = async (page = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getTripStatusHistory(tripId, {
        page: page,
        limit: 20
      }) as StatusHistoryData
      setData(response)
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load status history:', error)
      setError(error instanceof Error ? error.message : 'Failed to load status history')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !data) {
      loadStatusHistory()
    }
  }, [isOpen, tripId])

  const renderStatusEntry = (entry: StatusHistoryEntry, index: number) => {
    const isFirst = index === 0
    const isLast = index === (data?.statusHistory.length || 0) - 1

    return (
      <div key={entry.id} className="relative">
        {/* Vertical line */}
        {!isLast && (
          <div className="absolute left-4 top-10 w-0.5 h-full bg-gray-200" />
        )}
        
        <div className="flex items-start gap-4 pb-6">
          {/* Icon */}
          <div 
            className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${entry.isAutomatic ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}
            `}
            aria-label={entry.isAutomatic ? 'Automatic status change' : 'Manual status change'}
          >
            {entry.isAutomatic ? (
              <Bot className="w-4 h-4" aria-hidden="true" />
            ) : (
              <User className="w-4 h-4" aria-hidden="true" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {entry.oldStatus && (
                <>
                  <StatusBadge status={entry.oldStatus} size="sm" />
                  <ArrowRight className="w-3 h-3 text-gray-400" aria-hidden="true" aria-label="changed to" />
                </>
              )}
              <StatusBadge status={entry.newStatus} size="sm" />
              
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  entry.isAutomatic ? 'border-blue-200 text-blue-700' : 'border-green-200 text-green-700'
                }`}
              >
                {entry.isAutomatic ? 'Automatic' : 'Manual'}
              </Badge>
            </div>

            <p className="text-sm text-gray-900 mb-2">
              {entry.description}
            </p>

            {entry.user && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <User className="w-3 h-3" aria-hidden="true" />
                <span>{entry.user.name || entry.user.email}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>
                  <time dateTime={entry.timestamp}>
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </time>
                </span>
              </div>
              
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span className="font-mono text-xs">
                    {entry.reason === 'itinerary_generated' && entry.metadata.daysGenerated && 
                      `${entry.metadata.daysGenerated} days generated`
                    }
                    {entry.reason === 'date_based' && 'Date-based transition'}
                    {entry.reason === 'manual' && 'User action'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="outline" 
            size="sm" 
            className={`focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
            aria-label="View trip status history"
          >
            <History className="w-4 h-4 mr-2" aria-hidden="true" />
            Status History
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="status-history-title"
        aria-describedby="status-history-description"
      >
        <DialogHeader>
          <DialogTitle id="status-history-title" className="flex items-center gap-2">
            <History className="w-5 h-5" aria-hidden="true" />
            Status History
            {data && (
              <span className="text-sm font-normal text-gray-500">
                for "{data.trip.title}"
              </span>
            )}
          </DialogTitle>
          <div id="status-history-description" className="sr-only">
            Timeline of status changes for this trip, showing automatic and manual transitions
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" aria-hidden="true" />
            <span className="ml-2 text-gray-600">Loading status history...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700" role="alert">
            <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
              <div className="text-sm">
                <span className="font-medium">{data.summary.totalChanges}</span>
                <span className="text-gray-600 ml-1">total changes</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-blue-600">{data.summary.automaticChanges}</span>
                <span className="text-gray-600 ml-1">automatic</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-green-600">{data.summary.manualChanges}</span>
                <span className="text-gray-600 ml-1">manual</span>
              </div>
              <div className="ml-auto">
                <StatusBadge 
                  status={data.trip.currentStatus} 
                  showTooltip 
                  variant="detailed"
                />
              </div>
            </div>

            {/* History Timeline */}
            <div className="flex-1 overflow-y-auto">
              {data.statusHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p>No status changes recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-0" role="log" aria-label="Status change timeline">
                  {data.statusHistory.map((entry, index) => 
                    renderStatusEntry(entry, index)
                  )}
                </div>
              )}
            </div>

            {/* Pagination */}
            {data.pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing page {data.pagination.page} of {data.pagination.pages}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => loadStatusHistory(currentPage - 1)}
                    aria-label={`Go to previous page (${currentPage - 1})`}
                    className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === data.pagination.pages}
                    onClick={() => loadStatusHistory(currentPage + 1)}
                    aria-label={`Go to next page (${currentPage + 1})`}
                    className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default StatusHistory