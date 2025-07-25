"use client"

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityCard } from './activity-card'
import { Day, Activity } from '@/lib/itinerary-types'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Utensils,
  Camera,
  Car
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DayCardProps {
  day: Day
  isExpanded: boolean
  onToggleExpanded: (expanded: boolean) => void
  onActivitySelect: (activity: Activity) => void
  onActivityEdit: (activity: Activity, dayNumber: number) => void
  onActivityRemove: (activity: Activity, dayNumber: number) => void
  onAddActivity: () => void
}

export function DayCard({
  day,
  isExpanded,
  onToggleExpanded,
  onActivitySelect,
  onActivityEdit,
  onActivityRemove,
  onAddActivity
}: DayCardProps) {
  const { setNodeRef } = useDroppable({
    id: `day-${day.day}`
  })

  // Calculate day statistics
  const totalActivities = day.activities.length
  const totalCost = day.activities.reduce((sum, activity) => {
    return sum + (activity.pricing?.amount || 0)
  }, 0)
  
  const timeRange = day.activities.length > 0 ? {
    start: day.activities.reduce((earliest, activity) => 
      activity.startTime < earliest ? activity.startTime : earliest
    , day.activities[0].startTime),
    end: day.activities.reduce((latest, activity) => 
      activity.endTime > latest ? activity.endTime : latest
    , day.activities[0].endTime)
  } : null

  const activityCounts = day.activities.reduce((counts, activity) => {
    counts[activity.type] = (counts[activity.type] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return <Utensils className="h-3 w-3" />
      case 'attraction': return <Camera className="h-3 w-3" />
      case 'transportation': return <Car className="h-3 w-3" />
      case 'accommodation': return <MapPin className="h-3 w-3" />
      default: return <MapPin className="h-3 w-3" />
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch {
      return time
    }
  }

  return (
    <Card className="overflow-hidden border-2 border-transparent hover:border-blue-200 transition-colors">
      <CardHeader 
        className="cursor-pointer select-none"
        onClick={() => onToggleExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-semibold text-sm">
                {day.day}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Day {day.day}
                </h3>
                <p className="text-sm text-gray-600">{formatDate(day.date)}</p>
              </div>
            </div>
            
            {day.theme && (
              <Badge variant="secondary" className="hidden sm:flex">
                {day.theme}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Day statistics */}
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{totalActivities}</span>
              </div>
              {timeRange && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(timeRange.start)} - {formatTime(timeRange.end)}</span>
                </div>
              )}
              {totalCost > 0 && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>{formatCurrency(totalCost)}</span>
                </div>
              )}
            </div>

            {/* Activity type indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {Object.entries(activityCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs"
                  title={`${count} ${type}${count > 1 ? 's' : ''}`}
                >
                  {getActivityTypeIcon(type)}
                  <span>{count}</span>
                </div>
              ))}
            </div>

            {/* Expand/collapse button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 w-8"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile statistics */}
        <div className="flex md:hidden items-center gap-4 text-sm text-gray-600 mt-2">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{totalActivities} activities</span>
          </div>
          {timeRange && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(timeRange.start)} - {formatTime(timeRange.end)}</span>
            </div>
          )}
          {totalCost > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>{formatCurrency(totalCost)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <CardContent
              ref={setNodeRef}
              className={`space-y-3 pt-0 ${
                day.activities.length === 0 
                  ? 'min-h-[120px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center'
                  : ''
              }`}
            >
              {day.activities.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">No activities planned for this day</p>
                  <Button
                    onClick={onAddActivity}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Activity
                  </Button>
                </div>
              ) : (
                <>
                  <SortableContext
                    items={day.activities.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {day.activities.map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ActivityCard
                            activity={activity}
                            dayNumber={day.day}
                            index={index}
                            onSelect={onActivitySelect}
                            onEdit={(activity) => onActivityEdit(activity, day.day)}
                            onRemove={(activity) => onActivityRemove(activity, day.day)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </SortableContext>

                  {/* Add activity button */}
                  <div className="pt-2 border-t border-gray-100">
                    <Button
                      onClick={onAddActivity}
                      variant="ghost"
                      className="w-full flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    >
                      <Plus className="h-4 w-4" />
                      Add Activity
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default DayCard