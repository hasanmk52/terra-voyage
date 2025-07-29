"use client"

import { useState, useCallback, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DayCard } from './day-card'
import { ActivityCard } from './activity-card'
import { ActivityModal } from './activity-modal'
import { TimelineView } from './timeline-view'
import { ItineraryControls } from './itinerary-controls'
import { Day, Activity, ActivityAction, TimelineConfig } from '@/lib/itinerary-types'
import { formatDateShort } from '@/lib/utils'
import { Calendar, Clock, MapPin, Plus, Undo2, Redo2, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ItineraryDisplayProps {
  days: Day[]
  onUpdateDays: (days: Day[]) => void
  onSave?: () => Promise<void>
  isLoading?: boolean
  isDirty?: boolean
  className?: string
}

export function ItineraryDisplay({
  days,
  onUpdateDays,
  onSave,
  isLoading = false,
  isDirty = false,
  className = ''
}: ItineraryDisplayProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [editingActivity, setEditingActivity] = useState<{ activity: Activity; dayNumber: number } | null>(null)
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null)
  const [showAddModal, setShowAddModal] = useState<{ dayNumber: number } | null>(null)
  const [history, setHistory] = useState<{ past: ActivityAction[]; future: ActivityAction[] }>({
    past: [],
    future: []
  })
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig>({
    showAllDays: true,
    expandedDays: new Set(days.map(d => d.day)),
    viewMode: 'cards',
    sortBy: 'time',
    filterBy: {}
  })

  // Execute action and update history
  const executeAction = useCallback((action: ActivityAction, addToHistory = true) => {
    const newDays = [...days]
    
    switch (action.type) {
      case 'MOVE_ACTIVITY': {
        const { fromDay, toDay, fromIndex, toIndex, activityId } = action.payload
        const fromDayData = newDays.find(d => d.day === fromDay)
        const toDayData = newDays.find(d => d.day === toDay)
        
        if (fromDayData && toDayData) {
          const activity = fromDayData.activities.splice(fromIndex, 1)[0]
          if (activity && activity.id === activityId) {
            toDayData.activities.splice(toIndex, 0, activity)
          }
        }
        break
      }
      case 'ADD_ACTIVITY': {
        const { dayNumber, activity, index } = action.payload
        const dayData = newDays.find(d => d.day === dayNumber)
        if (dayData) {
          dayData.activities.splice(index, 0, activity)
        }
        break
      }
      case 'REMOVE_ACTIVITY': {
        const { dayNumber, activityId } = action.payload
        const dayData = newDays.find(d => d.day === dayNumber)
        if (dayData) {
          const activityIndex = dayData.activities.findIndex(a => a.id === activityId)
          if (activityIndex !== -1) {
            dayData.activities.splice(activityIndex, 1)
          }
        }
        break
      }
      case 'UPDATE_ACTIVITY': {
        const { dayNumber, activityId, newActivity } = action.payload
        const dayData = newDays.find(d => d.day === dayNumber)
        if (dayData) {
          const activityIndex = dayData.activities.findIndex(a => a.id === activityId)
          if (activityIndex !== -1) {
            dayData.activities[activityIndex] = newActivity
          }
        }
        break
      }
    }
    
    onUpdateDays(newDays)
    
    if (addToHistory) {
      setHistory(prev => ({
        past: [...prev.past, action],
        future: []
      }))
    }
  }, [days, onUpdateDays])

  // Undo last action
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return
    
    const lastAction = history.past[history.past.length - 1]
    const reverseAction = getReverseAction(lastAction, days)
    
    if (reverseAction) {
      executeAction(reverseAction, false)
      setHistory(prev => ({
        past: prev.past.slice(0, -1),
        future: [lastAction, ...prev.future]
      }))
    }
  }, [history.past, days, executeAction])

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return
    
    const nextAction = history.future[0]
    executeAction(nextAction, false)
    
    setHistory(prev => ({
      past: [...prev.past, nextAction],
      future: prev.future.slice(1)
    }))
  }, [history.future, executeAction])

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activityId = active.id as string
    
    // Find the activity being dragged
    for (const day of days) {
      const activity = day.activities.find(a => a.id === activityId)
      if (activity) {
        setDraggedActivity(activity)
        break
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedActivity(null)
    
    if (!over || active.id === over.id) return
    
    const activeId = active.id as string
    const overId = over.id as string
    
    // Find source and destination
    let sourceDay = -1
    let sourceIndex = -1
    let targetDay = -1
    let targetIndex = -1
    
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const activityIndex = day.activities.findIndex(a => a.id === activeId)
      if (activityIndex !== -1) {
        sourceDay = day.day
        sourceIndex = activityIndex
        break
      }
    }
    
    // Determine target position
    if (overId.startsWith('day-')) {
      // Dropped on a day container
      targetDay = parseInt(overId.replace('day-', ''))
      const dayData = days.find(d => d.day === targetDay)
      targetIndex = dayData ? dayData.activities.length : 0
    } else {
      // Dropped on another activity
      for (let i = 0; i < days.length; i++) {
        const day = days[i]
        const activityIndex = day.activities.findIndex(a => a.id === overId)
        if (activityIndex !== -1) {
          targetDay = day.day
          targetIndex = activityIndex
          break
        }
      }
    }
    
    if (sourceDay !== -1 && targetDay !== -1) {
      executeAction({
        type: 'MOVE_ACTIVITY',
        payload: {
          fromDay: sourceDay,
          toDay: targetDay,
          fromIndex: sourceIndex,
          toIndex: targetIndex,
          activityId: activeId
        }
      })
    }
  }

  // Activity management handlers
  const handleAddActivity = (dayNumber: number, activity: Activity) => {
    const dayData = days.find(d => d.day === dayNumber)
    if (dayData) {
      executeAction({
        type: 'ADD_ACTIVITY',
        payload: {
          dayNumber,
          activity,
          index: dayData.activities.length
        }
      })
    }
    setShowAddModal(null)
  }

  const handleEditActivity = (activity: Activity, dayNumber: number) => {
    setEditingActivity({ activity, dayNumber })
  }

  const handleUpdateActivity = (oldActivity: Activity, newActivity: Activity, dayNumber: number) => {
    executeAction({
      type: 'UPDATE_ACTIVITY',
      payload: {
        dayNumber,
        activityId: oldActivity.id,
        oldActivity,
        newActivity
      }
    })
    setEditingActivity(null)
  }

  const handleRemoveActivity = (activity: Activity, dayNumber: number) => {
    const dayData = days.find(d => d.day === dayNumber)
    if (dayData) {
      const index = dayData.activities.findIndex(a => a.id === activity.id)
      executeAction({
        type: 'REMOVE_ACTIVITY',
        payload: {
          dayNumber,
          activityId: activity.id,
          index,
          activity
        }
      })
    }
  }

  // Calculate total statistics
  // Apply sorting and filtering to days
  const processedDays = useMemo(() => {
    return days.map(day => {
      // Filter activities within each day
      let filteredActivities = day.activities.filter(activity => {
        // Type filter
        if (timelineConfig.filterBy.type && activity.type !== timelineConfig.filterBy.type) {
          return false
        }
        
        // Time slot filter
        if (timelineConfig.filterBy.timeSlot && activity.timeSlot !== timelineConfig.filterBy.timeSlot) {
          return false
        }
        
        // Price range filter
        if (timelineConfig.filterBy.priceRange) {
          const [min, max] = timelineConfig.filterBy.priceRange
          const activityPrice = activity.pricing?.amount || 0
          if (activityPrice < min || activityPrice > max) {
            return false
          }
        }
        
        return true
      })

      // Sort activities within each day
      filteredActivities = [...filteredActivities].sort((a, b) => {
        switch (timelineConfig.sortBy) {
          case 'time':
            return a.startTime.localeCompare(b.startTime)
          case 'type':
            return a.type.localeCompare(b.type)
          case 'price':
            const priceA = a.pricing?.amount || 0
            const priceB = b.pricing?.amount || 0
            return priceA - priceB
          default:
            return 0
        }
      })

      return {
        ...day,
        activities: filteredActivities
      }
    })
  }, [days, timelineConfig.filterBy, timelineConfig.sortBy])

  const totalActivities = processedDays.reduce((sum, day) => sum + day.activities.length, 0)
  const totalDuration = processedDays.reduce((sum, day) => {
    return sum + day.activities.reduce((daySum, activity) => {
      const duration = parseInt(activity.duration?.match(/\d+/)?.[0] || '0')
      return daySum + duration
    }, 0)
  }, 0)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with statistics and controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Your Itinerary</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{processedDays.length} days</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{totalActivities} activities</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round(totalDuration / 60)} hours</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={history.past.length === 0}
            className="flex items-center gap-1"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={history.future.length === 0}
            className="flex items-center gap-1"
          >
            <Redo2 className="h-4 w-4" />
            Redo
          </Button>
          {onSave && (
            <Button
              onClick={onSave}
              disabled={isLoading || !isDirty}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* View controls */}
      <ItineraryControls
        config={timelineConfig}
        onConfigChange={setTimelineConfig}
      />

      {/* Main content */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {timelineConfig.viewMode === 'timeline' ? (
          <TimelineView
            days={processedDays}
            config={timelineConfig}
            onActivitySelect={setSelectedActivity}
            onActivityEdit={handleEditActivity}
            onActivityRemove={handleRemoveActivity}
          />
        ) : (
          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {processedDays.map((day) => (
                <motion.div
                  key={day.day}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DayCard
                    day={day}
                    isExpanded={timelineConfig.expandedDays.has(day.day)}
                    onToggleExpanded={(expanded) => {
                      setTimelineConfig(prev => ({
                        ...prev,
                        expandedDays: expanded
                          ? new Set([...prev.expandedDays, day.day])
                          : new Set([...prev.expandedDays].filter(d => d !== day.day))
                      }))
                    }}
                    onActivitySelect={setSelectedActivity}
                    onActivityEdit={handleEditActivity}
                    onActivityRemove={handleRemoveActivity}
                    onAddActivity={() => setShowAddModal({ dayNumber: day.day })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {draggedActivity && (
            <div className="transform rotate-3 opacity-90">
              <ActivityCard
                activity={draggedActivity}
                isDragging
                onSelect={() => {}}
                onEdit={() => {}}
                onRemove={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {showAddModal && (
        <ActivityModal
          isOpen={true}
          onClose={() => setShowAddModal(null)}
          onSave={(activity) => handleAddActivity(showAddModal.dayNumber, activity)}
          dayNumber={showAddModal.dayNumber}
        />
      )}

      {editingActivity && (
        <ActivityModal
          isOpen={true}
          onClose={() => setEditingActivity(null)}
          onSave={(activity) => handleUpdateActivity(
            editingActivity.activity,
            activity,
            editingActivity.dayNumber
          )}
          activity={editingActivity.activity}
          dayNumber={editingActivity.dayNumber}
        />
      )}
    </div>
  )
}

// Helper function to create reverse actions for undo
function getReverseAction(action: ActivityAction, days: Day[]): ActivityAction | null {
  switch (action.type) {
    case 'MOVE_ACTIVITY':
      return {
        type: 'MOVE_ACTIVITY',
        payload: {
          fromDay: action.payload.toDay,
          toDay: action.payload.fromDay,
          fromIndex: action.payload.toIndex,
          toIndex: action.payload.fromIndex,
          activityId: action.payload.activityId
        }
      }
    case 'ADD_ACTIVITY':
      return {
        type: 'REMOVE_ACTIVITY',
        payload: {
          dayNumber: action.payload.dayNumber,
          activityId: action.payload.activity.id,
          index: action.payload.index,
          activity: action.payload.activity
        }
      }
    case 'REMOVE_ACTIVITY':
      return {
        type: 'ADD_ACTIVITY',
        payload: {
          dayNumber: action.payload.dayNumber,
          activity: action.payload.activity,
          index: action.payload.index
        }
      }
    case 'UPDATE_ACTIVITY':
      return {
        type: 'UPDATE_ACTIVITY',
        payload: {
          dayNumber: action.payload.dayNumber,
          activityId: action.payload.activityId,
          oldActivity: action.payload.newActivity,
          newActivity: action.payload.oldActivity
        }
      }
    default:
      return null
  }
}

export default ItineraryDisplay