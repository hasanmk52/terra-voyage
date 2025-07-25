"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityCard } from './activity-card'
import { Day, Activity, TimelineConfig } from '@/lib/itinerary-types'
import { getActivityIcon, getActivityColor, formatTimeRange } from '@/lib/itinerary-types'
import { formatCurrency } from '@/lib/utils'
import {
  Clock,
  MapPin,
  DollarSign,
  ChevronRight,
  Calendar,
  Activity as ActivityIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TimelineViewProps {
  days: Day[]
  config: TimelineConfig
  onActivitySelect: (activity: Activity) => void
  onActivityEdit: (activity: Activity, dayNumber: number) => void
  onActivityRemove: (activity: Activity, dayNumber: number) => void
}

export function TimelineView({
  days,
  config,
  onActivitySelect,
  onActivityEdit,
  onActivityRemove
}: TimelineViewProps) {
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null)

  // Filter and sort activities based on config
  const getFilteredActivities = (day: Day) => {
    let activities = [...day.activities]

    // Apply filters
    if (config.filterBy.type) {
      activities = activities.filter(a => a.type === config.filterBy.type)
    }
    if (config.filterBy.timeSlot) {
      activities = activities.filter(a => a.timeSlot === config.filterBy.timeSlot)
    }
    if (config.filterBy.priceRange) {
      const [min, max] = config.filterBy.priceRange
      activities = activities.filter(a => {
        const price = a.pricing?.amount || 0
        return price >= min && price <= max
      })
    }

    // Apply sorting
    switch (config.sortBy) {
      case 'time':
        activities.sort((a, b) => a.startTime.localeCompare(b.startTime))
        break
      case 'type':
        activities.sort((a, b) => a.type.localeCompare(b.type))
        break
      case 'price':
        activities.sort((a, b) => (b.pricing?.amount || 0) - (a.pricing?.amount || 0))
        break
    }

    return activities
  }

  // Calculate timeline positions
  const getTimelinePosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const startOfDay = 6 * 60 // 6 AM
    const endOfDay = 22 * 60 // 10 PM
    const dayDuration = endOfDay - startOfDay

    const position = ((totalMinutes - startOfDay) / dayDuration) * 100
    return Math.max(0, Math.min(100, position))
  }

  const getActivityDuration = (activity: Activity) => {
    const start = activity.startTime.split(':').map(Number)
    const end = activity.endTime.split(':').map(Number)
    const startMinutes = start[0] * 60 + start[1]
    const endMinutes = end[0] * 60 + end[1]
    return Math.max(30, endMinutes - startMinutes) // Minimum 30 minutes for visibility
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const filteredDays = config.showAllDays 
    ? days 
    : days.filter(day => config.expandedDays.has(day.day))

  return (
    <div className="space-y-6">
      {filteredDays.map((day) => {
        const filteredActivities = getFilteredActivities(day)
        
        if (filteredActivities.length === 0 && Object.keys(config.filterBy).length > 0) {
          return null // Hide empty days when filters are active
        }

        return (
          <motion.div
            key={day.day}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      {day.day}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Day {day.day}</h3>
                      <p className="text-sm text-gray-600">{formatDate(day.date)}</p>
                    </div>
                    {day.theme && (
                      <Badge variant="secondary">{day.theme}</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <ActivityIcon className="h-4 w-4" />
                      <span>{filteredActivities.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {formatCurrency(
                          filteredActivities.reduce((sum, a) => sum + (a.pricing?.amount || 0), 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                {filteredActivities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No activities planned for this day</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline */}
                    <div className="flex">
                      {/* Time column */}
                      <div className="w-20 flex-shrink-0 bg-gray-50 border-r">
                        <div className="sticky top-0 py-4 space-y-4">
                          {Array.from({ length: 17 }, (_, i) => {
                            const hour = i + 6 // Start from 6 AM
                            return (
                              <div key={hour} className="text-xs text-gray-500 text-center">
                                {formatTime(`${hour.toString().padStart(2, '0')}:00`)}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Activities column */}
                      <div className="flex-1 relative min-h-[400px]">
                        {/* Hour lines */}
                        {Array.from({ length: 17 }, (_, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 border-t border-gray-100"
                            style={{ top: `${(i / 16) * 100}%` }}
                          />
                        ))}

                        {/* Activities */}
                        <div className="relative p-4">
                          {filteredActivities.map((activity, index) => {
                            const topPosition = getTimelinePosition(activity.startTime)
                            const duration = getActivityDuration(activity)
                            const height = (duration / (16 * 60)) * 100 // 16 hours * 60 minutes

                            return (
                              <motion.div
                                key={activity.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="absolute left-4 right-4 cursor-pointer group"
                                style={{
                                  top: `${topPosition}%`,
                                  height: `${Math.max(height, 8)}%` // Minimum height for visibility
                                }}
                                onMouseEnter={() => setHoveredActivity(activity.id)}
                                onMouseLeave={() => setHoveredActivity(null)}
                                onClick={() => onActivitySelect(activity)}
                              >
                                <div
                                  className={`h-full rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-all duration-200 ${
                                    hoveredActivity === activity.id ? 'scale-105 z-10' : ''
                                  }`}
                                  style={{
                                    borderLeftColor: getActivityColor(activity.type).includes('red') ? '#EF4444' :
                                                   getActivityColor(activity.type).includes('amber') ? '#F59E0B' :
                                                   getActivityColor(activity.type).includes('emerald') ? '#10B981' :
                                                   getActivityColor(activity.type).includes('blue') ? '#3B82F6' :
                                                   getActivityColor(activity.type).includes('purple') ? '#8B5CF6' :
                                                   '#6B7280'
                                  }}
                                >
                                  <div className="p-3 h-full flex flex-col justify-center">
                                    <div className="flex items-start gap-2">
                                      <div className="text-lg flex-shrink-0">
                                        {getActivityIcon(activity.type)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-medium text-sm text-gray-900 truncate">
                                            {activity.name}
                                          </h4>
                                          <Badge className={`text-xs ${getActivityColor(activity.type)}`}>
                                            {activity.type}
                                          </Badge>
                                        </div>
                                        
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatTimeRange(activity.startTime, activity.endTime)}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">{activity.location.name}</span>
                                          </div>
                                          {activity.pricing && activity.pricing.amount > 0 && (
                                            <div className="flex items-center gap-1">
                                              <DollarSign className="h-3 w-3" />
                                              <span>{formatCurrency(activity.pricing.amount)}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>

                        {/* Current time indicator (if viewing today) */}
                        {day.date === new Date().toISOString().split('T')[0] && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                            style={{
                              top: `${getTimelinePosition(
                                new Date().toTimeString().slice(0, 5)
                              )}%`
                            }}
                          >
                            <div className="absolute left-2 -top-2 w-4 h-4 bg-red-500 rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}

      {/* Empty state when all days are filtered out */}
      {filteredDays.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more activities.</p>
        </div>
      )}
    </div>
  )
}

export default TimelineView