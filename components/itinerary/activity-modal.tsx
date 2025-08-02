"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Activity, ActivityFormData, validateActivityForm } from '@/lib/itinerary-types'
import { generateId } from '@/lib/utils'
import {
  MapPin,
  Clock,
  DollarSign,
  Info,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react'

// Form validation schema
const activityFormSchema = z.object({
  name: z.string().min(1, 'Activity name is required'),
  type: z.enum(['attraction', 'restaurant', 'experience', 'transportation', 'accommodation', 'shopping']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  timeSlot: z.enum(['morning', 'afternoon', 'evening']),
  location: z.object({
    name: z.string().min(1, 'Location name is required'),
    address: z.string().min(1, 'Address is required'),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    })
  }),
  pricing: z.object({
    amount: z.number().min(0, 'Price must be 0 or greater'),
    currency: z.string().length(3, 'Currency must be 3 characters'),
    priceType: z.enum(['per_person', 'per_group', 'free'])
  }),
  duration: z.string().min(1, 'Duration is required'),
  tips: z.array(z.string()),
  bookingRequired: z.boolean(),
  accessibility: z.object({
    wheelchairAccessible: z.boolean(),
    hasElevator: z.boolean(),
    notes: z.string()
  })
})

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (activity: Activity) => void
  activity?: Activity
  dayNumber: number
}

export function ActivityModal({
  isOpen,
  onClose,
  onSave,
  activity,
  dayNumber
}: ActivityModalProps) {
  const [newTip, setNewTip] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const isEditing = !!activity

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: activity ? {
      name: activity.name,
      type: activity.type,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      timeSlot: activity.timeSlot,
      location: {
        name: activity.location.name,
        address: activity.location.address,
        coordinates: activity.location.coordinates
      },
      pricing: {
        amount: activity.pricing.amount,
        currency: activity.pricing.currency,
        priceType: activity.pricing.priceType
      },
      duration: activity.duration,
      tips: activity.tips || [],
      bookingRequired: activity.bookingRequired,
      accessibility: {
        wheelchairAccessible: activity.accessibility.wheelchairAccessible,
        hasElevator: activity.accessibility.hasElevator,
        notes: activity.accessibility.notes
      }
    } : {
      name: '',
      type: 'attraction',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      timeSlot: 'morning',
      location: {
        name: '',
        address: '',
        coordinates: { lat: 0, lng: 0 }
      },
      pricing: {
        amount: 0,
        currency: 'USD',
        priceType: 'per_person'
      },
      duration: '60 minutes',
      tips: [],
      bookingRequired: false,
      accessibility: {
        wheelchairAccessible: false,
        hasElevator: false,
        notes: ''
      }
    }
  })

  const watchedValues = watch()
  const tips = watch('tips') || []

  // Auto-calculate time slot based on start time
  useEffect(() => {
    const startTime = watchedValues.startTime
    if (startTime) {
      const hour = parseInt(startTime.split(':')[0])
      let timeSlot: 'morning' | 'afternoon' | 'evening' = 'morning'
      
      if (hour >= 12 && hour < 17) {
        timeSlot = 'afternoon'
      } else if (hour >= 17) {
        timeSlot = 'evening'
      }
      
      setValue('timeSlot', timeSlot)
    }
  }, [watchedValues.startTime, setValue])

  // Add tip
  const handleAddTip = () => {
    if (newTip.trim() && tips.length < 5) {
      setValue('tips', [...tips, newTip.trim()])
      setNewTip('')
    }
  }

  // Remove tip
  const handleRemoveTip = (index: number) => {
    setValue('tips', tips.filter((_, i) => i !== index))
  }

  // Form submission
  const onSubmit = async (data: ActivityFormData) => {
    setIsLoading(true)
    
    try {
      const newActivity: Activity = {
        id: activity?.id || generateId(),
        name: data.name,
        type: data.type,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        timeSlot: data.timeSlot,
        location: data.location,
        pricing: data.pricing,
        duration: data.duration,
        tips: data.tips,
        bookingRequired: data.bookingRequired,
        accessibility: data.accessibility,
        // Preserve existing fields if editing
        ...(activity && {
          rating: activity.rating,
          estimatedPrice: activity.estimatedPrice,
          priceCategory: activity.priceCategory,
          bookingUrl: activity.bookingUrl,
          images: activity.images,
          isFavorite: activity.isFavorite,
          order: activity.order
        })
      }

      onSave(newActivity)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset()
      setNewTip('')
    }
  }, [isOpen, reset])

  const activityTypes = [
    { value: 'attraction', label: 'Attraction', icon: '🎯' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'experience', label: 'Experience', icon: '⭐' },
    { value: 'transportation', label: 'Transportation', icon: '🚗' },
    { value: 'accommodation', label: 'Accommodation', icon: '🏨' }
  ]

  const priceTypes = [
    { value: 'free', label: 'Free' },
    { value: 'per_person', label: 'Per Person' },
    { value: 'per_group', label: 'Per Group' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white z-50">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Activity' : `Add Activity - Day ${dayNumber}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Activity Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Visit Eiffel Tower"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label>Activity Type *</Label>
              <Select
                value={watchedValues.type}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the activity, what to expect, highlights..."
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timing
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register('startTime')}
                  className={errors.startTime ? 'border-red-500' : ''}
                />
                {errors.startTime && (
                  <p className="text-sm text-red-500 mt-1">{errors.startTime.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register('endTime')}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-500 mt-1">{errors.endTime.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  {...register('duration')}
                  placeholder="e.g., 2 hours"
                  className={errors.duration ? 'border-red-500' : ''}
                />
                {errors.duration && (
                  <p className="text-sm text-red-500 mt-1">{errors.duration.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Time Slot</Label>
              <div className="flex gap-2 mt-2">
                {['morning', 'afternoon', 'evening'].map((slot) => (
                  <Badge
                    key={slot}
                    variant={watchedValues.timeSlot === slot ? 'default' : 'outline'}
                    className="capitalize cursor-pointer"
                    onClick={() => setValue('timeSlot', slot as any)}
                  >
                    {slot}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </h3>
            
            <div>
              <Label htmlFor="locationName">Location Name *</Label>
              <Input
                id="locationName"
                {...register('location.name')}
                placeholder="e.g., Eiffel Tower"
                className={errors.location?.name ? 'border-red-500' : ''}
              />
              {errors.location?.name && (
                <p className="text-sm text-red-500 mt-1">{errors.location.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="locationAddress">Address *</Label>
              <Input
                id="locationAddress"
                {...register('location.address')}
                placeholder="Full address or area"
                className={errors.location?.address ? 'border-red-500' : ''}
              />
              {errors.location?.address && (
                <p className="text-sm text-red-500 mt-1">{errors.location.address.message}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('pricing.amount', { valueAsNumber: true })}
                  className={errors.pricing?.amount ? 'border-red-500' : ''}
                />
                {errors.pricing?.amount && (
                  <p className="text-sm text-red-500 mt-1">{errors.pricing.amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  {...register('pricing.currency')}
                  placeholder="USD"
                  maxLength={3}
                  className={errors.pricing?.currency ? 'border-red-500' : ''}
                />
                {errors.pricing?.currency && (
                  <p className="text-sm text-red-500 mt-1">{errors.pricing.currency.message}</p>
                )}
              </div>

              <div>
                <Label>Price Type</Label>
                <Select
                  value={watchedValues.pricing?.priceType}
                  onValueChange={(value) => setValue('pricing.priceType', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Tips & Notes
            </h3>
            
            {tips.length > 0 && (
              <div className="space-y-2">
                {tips.map((tip, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm">{tip}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTip(index)}
                      className="p-1 h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {tips.length < 5 && (
              <div className="flex gap-2">
                <Input
                  value={newTip}
                  onChange={(e) => setNewTip(e.target.value)}
                  placeholder="Add a helpful tip..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTip())}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTip}
                  disabled={!newTip.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="bookingRequired">Booking Required</Label>
                <p className="text-sm text-gray-600">Advance booking or reservation required</p>
              </div>
              <Switch
                id="bookingRequired"
                checked={watchedValues.bookingRequired}
                onCheckedChange={(checked) => setValue('bookingRequired', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="wheelchairAccessible">Wheelchair Accessible</Label>
                <p className="text-sm text-gray-600">Location is accessible for wheelchairs</p>
              </div>
              <Switch
                id="wheelchairAccessible"
                checked={watchedValues.accessibility?.wheelchairAccessible}
                onCheckedChange={(checked) => setValue('accessibility.wheelchairAccessible', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="hasElevator">Has Elevator</Label>
                <p className="text-sm text-gray-600">Elevator access available</p>
              </div>
              <Switch
                id="hasElevator"
                checked={watchedValues.accessibility?.hasElevator}
                onCheckedChange={(checked) => setValue('accessibility.hasElevator', checked)}
              />
            </div>

            <div>
              <Label htmlFor="accessibilityNotes">Accessibility Notes</Label>
              <Textarea
                id="accessibilityNotes"
                {...register('accessibility.notes')}
                placeholder="Additional accessibility information..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-6 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || isLoading}
              className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white disabled:text-gray-500 shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Add'} Activity
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ActivityModal