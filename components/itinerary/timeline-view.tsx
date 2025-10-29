"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Day, Activity, TimelineConfig } from '@/lib/itinerary-types'
import { getActivityIcon, getActivityColor } from '@/lib/itinerary-types'
import { formatCurrency } from '@/lib/utils'
import {
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
}

export function TimelineView({
  days,
  config,
  onActivitySelect
}: TimelineViewProps) {

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
                          filteredActivities.reduce((sum, a) => sum + (a.pricing?.amount || 0), 0),
                          filteredActivities[0]?.pricing?.currency || 'USD'
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
                  <div className="space-y-3 p-4">
                    {/* Simplified Timeline */}
                    {filteredActivities.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
                        onMouseEnter={() => setHoveredActivity(activity.id)}
                        onMouseLeave={() => setHoveredActivity(null)}
                        onClick={() => onActivitySelect(activity)}
                      >
                        {/* Time */}
                        <div className="flex-shrink-0 w-20 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {formatTime(activity.startTime)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(activity.endTime)}
                          </div>
                        </div>

                        {/* Timeline connector */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: getActivityColor(activity.type).includes('red') ? '#EF4444' :
                                             getActivityColor(activity.type).includes('amber') ? '#F59E0B' :
                                             getActivityColor(activity.type).includes('emerald') ? '#10B981' :
                                             getActivityColor(activity.type).includes('blue') ? '#3B82F6' :
                                             getActivityColor(activity.type).includes('purple') ? '#8B5CF6' :
                                             '#6B7280'
                            }}
                          />
                          {index < filteredActivities.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-200 mt-2" />
                          )}
                        </div>

                        {/* Activity content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-lg flex-shrink-0">
                                {getActivityIcon(activity.type)}
                              </div>
                              <h4 className="font-medium text-gray-900 truncate">
                                {activity.name}
                              </h4>
                            </div>
                            <Badge className={`text-xs ${getActivityColor(activity.type)} flex-shrink-0`}>
                              {activity.type}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{activity.location.name}</span>
                            </div>
                            {activity.pricing && activity.pricing.amount > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span>{formatCurrency(activity.pricing.amount, activity.pricing.currency)}</span>
                              </div>
                            )}
                            {activity.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex-shrink-0 self-center">
                          <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.div>
                    ))}
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
