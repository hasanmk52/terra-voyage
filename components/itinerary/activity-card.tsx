"use client"

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Activity } from '@/lib/itinerary-types'
import { formatTimeRange, getActivityIcon, getActivityColor } from '@/lib/itinerary-types'
import { formatCurrency } from '@/lib/utils'
import {
  Clock,
  MapPin,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Star,
  GripVertical,
  ExternalLink,
  Heart,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ActivityCardProps {
  activity: Activity
  dayNumber?: number
  index?: number
  isDragging?: boolean
  onSelect: (activity: Activity) => void
  onEdit: (activity: Activity) => void
  onRemove: (activity: Activity) => void
  onToggleFavorite?: (activity: Activity) => void
  className?: string
}

export function ActivityCard({
  activity,
  dayNumber,
  index,
  isDragging = false,
  onSelect,
  onEdit,
  onRemove,
  onToggleFavorite,
  className = ''
}: ActivityCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const formatPrice = (pricing: Activity['pricing']) => {
    if (!pricing || pricing.amount === 0) return 'Free'
    return `${formatCurrency(pricing.amount)} ${pricing.priceType === 'per_person' ? '/person' : pricing.priceType === 'per_group' ? '/group' : ''}`
  }

  const getPriorityColor = () => {
    if (activity.bookingRequired) return 'border-l-red-500'
    if (activity.type === 'transportation') return 'border-l-blue-500'
    if (activity.type === 'restaurant') return 'border-l-amber-500'
    return 'border-l-gray-300'
  }

  const formatDuration = (duration: string) => {
    const minutes = parseInt(duration.match(/\d+/)?.[0] || '0')
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  if (isDragging) {
    return (
      <Card className={`bg-white shadow-lg border-2 border-blue-300 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{activity.name}</h4>
              <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={className}
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`group hover:shadow-md transition-all duration-200 border-l-4 ${getPriorityColor()} ${
          activity.isFavorite ? 'ring-2 ring-pink-200' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <div 
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>

            {/* Activity icon */}
            <div className="text-2xl flex-shrink-0 mt-1">
              {getActivityIcon(activity.type)}
            </div>

            {/* Activity content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 
                      className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                      onClick={() => onSelect(activity)}
                    >
                      {activity.name}
                    </h4>
                    {activity.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{activity.rating}</span>
                      </div>
                    )}
                    {activity.isFavorite && (
                      <Heart className="h-4 w-4 text-pink-500 fill-current" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getActivityColor(activity.type)}>
                      {activity.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {activity.timeSlot}
                    </Badge>
                    {activity.bookingRequired && (
                      <Badge variant="destructive" className="text-xs">
                        Booking Required
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {activity.description}
                  </p>

                  {/* Activity details */}
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeRange(activity.startTime, activity.endTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{formatDuration(activity.duration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{activity.location.address}</span>
                    </div>

                    {activity.pricing && activity.pricing.amount > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatPrice(activity.pricing)}</span>
                        {activity.priceCategory && (
                          <span className="text-gray-400">({activity.priceCategory})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable details */}
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                    >
                      {activity.tips && activity.tips.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Tips:</h5>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {activity.tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-gray-400">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activity.accessibility && (
                        <div>
                          <h5 className="text-xs font-medium text-gray-700 mb-1">Accessibility:</h5>
                          <div className="text-xs text-gray-600 space-y-1">
                            {activity.accessibility.wheelchairAccessible && (
                              <div>• Wheelchair accessible</div>
                            )}
                            {activity.accessibility.hasElevator && (
                              <div>• Elevator available</div>
                            )}
                            {activity.accessibility.notes && (
                              <div>• {activity.accessibility.notes}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onSelect(activity)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
                      <Info className="h-4 w-4 mr-2" />
                      {showDetails ? 'Hide' : 'Show'} Info
                    </DropdownMenuItem>
                    {onToggleFavorite && (
                      <DropdownMenuItem onClick={() => onToggleFavorite(activity)}>
                        <Heart className={`h-4 w-4 mr-2 ${activity.isFavorite ? 'fill-current text-pink-500' : ''}`} />
                        {activity.isFavorite ? 'Remove from' : 'Add to'} Favorites
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(activity)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Activity
                    </DropdownMenuItem>
                    {activity.bookingUrl && (
                      <DropdownMenuItem 
                        onClick={() => window.open(activity.bookingUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Book Now
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onRemove(activity)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ActivityCard