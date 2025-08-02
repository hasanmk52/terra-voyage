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
    <Card className="overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-blue-50/20">
      <CardHeader 
        className="cursor-pointer select-none bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/20 border-b border-gray-100"
        onClick={() => onToggleExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          {/* Left side - Day info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-md">
                {day.day}
              </div>
              {totalActivities > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                  {totalActivities}
                </div>
              )}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-xl text-gray-900">
                  Day {day.day}
                </h3>
                {day.theme && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
                    {day.theme}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1 font-medium">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span>{formatDate(day.date)}</span>
                </div>
                {timeRange && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span>{formatTime(timeRange.start)} - {formatTime(timeRange.end)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Summary & Controls */}
          <div className="flex items-center gap-4">
            {/* Summary stats - desktop only */}
            <div className="hidden lg:flex items-center gap-6">
              {totalCost > 0 && (
                <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-700">{formatCurrency(totalCost)}</span>
                </div>
              )}
              
              {/* Activity type summary */}
              <div className="flex items-center gap-2">
                {Object.entries(activityCounts).slice(0, 3).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm shadow-sm"
                    title={`${count} ${type}${count > 1 ? 's' : ''}`}
                  >
                    {getActivityTypeIcon(type)}
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(activityCounts).length > 3 && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
                    +{Object.keys(activityCounts).length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Expand/collapse button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-10 w-10 rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile summary */}
        <div className="flex lg:hidden items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {totalCost > 0 && (
              <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md">
                <DollarSign className="h-3 w-3 text-green-600" />
                <span className="font-medium text-green-700">{formatCurrency(totalCost)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {Object.entries(activityCounts).slice(0, 2).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-xs"
                title={`${count} ${type}${count > 1 ? 's' : ''}`}
              >
                {getActivityTypeIcon(type)}
                <span>{count}</span>
              </div>
            ))}
          </div>
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
                    className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 transition-all duration-200 hover:shadow-sm focus:ring-2 focus:ring-blue-200"
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
                      className="w-full flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 hover:shadow-sm focus:ring-2 focus:ring-blue-200 rounded-lg py-3"
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