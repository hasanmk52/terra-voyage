import { Activity as BaseActivity, Day as BaseDay } from './itinerary-validation'

// Extended Activity type for UI components
export interface Activity extends BaseActivity {
  rating?: number
  estimatedPrice?: number
  priceCategory?: 'budget' | 'mid-range' | 'luxury'
  bookingUrl?: string
  images?: string[]
  isEditable?: boolean
  isFavorite?: boolean
  order?: number
}

// Extended Day type for UI components
export interface Day extends Omit<BaseDay, 'activities'> {
  activities: Activity[]
  isExpanded?: boolean
}

// Activity action types for undo/redo
export type ActivityAction = 
  | { type: 'MOVE_ACTIVITY'; payload: { fromDay: number; toDay: number; fromIndex: number; toIndex: number; activityId: string } }
  | { type: 'ADD_ACTIVITY'; payload: { dayNumber: number; activity: Activity; index: number } }
  | { type: 'REMOVE_ACTIVITY'; payload: { dayNumber: number; activityId: string; index: number; activity: Activity } }
  | { type: 'UPDATE_ACTIVITY'; payload: { dayNumber: number; activityId: string; oldActivity: Activity; newActivity: Activity } }
  | { type: 'SWAP_ACTIVITIES'; payload: { day1: number; day2: number; activity1Id: string; activity2Id: string } }

// History state for undo/redo
export interface HistoryState {
  past: ActivityAction[]
  present: Day[]
  future: ActivityAction[]
}

// Activity form data
export interface ActivityFormData {
  name: string
  type: Activity['type']
  description: string
  startTime: string
  endTime: string
  timeSlot: Activity['timeSlot']
  location: {
    name: string
    address: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  pricing: {
    amount: number
    currency: string
    priceType: 'per_person' | 'per_group' | 'free'
  }
  duration: string
  tips: string[]
  bookingRequired: boolean
  accessibility: {
    wheelchairAccessible: boolean
    hasElevator: boolean
    notes: string
  }
}

// Activity suggestion type
export interface ActivitySuggestion {
  id: string
  name: string
  type: Activity['type']
  description: string
  estimatedPrice: number
  duration: string
  rating?: number
  distance?: number
  timeSlot: Activity['timeSlot']
  location: {
    name: string
    address: string
  }
}

// Timeline view configuration
export interface TimelineConfig {
  showAllDays: boolean
  expandedDays: Set<number>
  viewMode: 'timeline' | 'cards'
  sortBy: 'time' | 'type' | 'price'
  filterBy: {
    type?: Activity['type']
    priceRange?: [number, number]
    timeSlot?: Activity['timeSlot']
  }
}

// Itinerary management context type
export interface ItineraryState {
  days: Day[]
  selectedActivityId: string | null
  isEditing: boolean
  history: HistoryState
  timelineConfig: TimelineConfig
  isDirty: boolean
  lastSaved?: Date
}

// Activity validation helpers
export const validateActivityForm = (data: Partial<ActivityFormData>): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  
  if (!data.name?.trim()) {
    errors.name = 'Activity name is required'
  }
  
  if (!data.type) {
    errors.type = 'Activity type is required'
  }
  
  if (!data.description?.trim() || data.description.length < 10) {
    errors.description = 'Description must be at least 10 characters'
  }
  
  if (!data.startTime) {
    errors.startTime = 'Start time is required'
  }
  
  if (!data.endTime) {
    errors.endTime = 'End time is required'
  }
  
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    errors.endTime = 'End time must be after start time'
  }
  
  if (!data.location?.name?.trim()) {
    errors['location.name'] = 'Location name is required'
  }
  
  if (!data.location?.address?.trim()) {
    errors['location.address'] = 'Location address is required'
  }
  
  if (data.pricing?.amount === undefined || data.pricing.amount < 0) {
    errors['pricing.amount'] = 'Price must be 0 or greater'
  }
  
  if (!data.duration?.trim()) {
    errors.duration = 'Duration is required'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Time formatting utilities
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

export const calculateActivityDuration = (startTime: string, endTime: string): number => {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  return (end.getTime() - start.getTime()) / (1000 * 60) // minutes
}

export const getActivityIcon = (type: Activity['type']): string => {
  switch (type) {
    case 'attraction': return '🎯'
    case 'restaurant': return '🍽️'
    case 'experience': return '⭐'
    case 'transportation': return '🚗'
    case 'accommodation': return '🏨'
    default: return '📍'
  }
}

export const getActivityColor = (type: Activity['type']): string => {
  switch (type) {
    case 'attraction': return 'bg-red-100 text-red-800'
    case 'restaurant': return 'bg-amber-100 text-amber-800'
    case 'experience': return 'bg-emerald-100 text-emerald-800'
    case 'transportation': return 'bg-blue-100 text-blue-800'
    case 'accommodation': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}