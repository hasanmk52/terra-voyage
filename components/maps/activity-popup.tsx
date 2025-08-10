"use client"

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Clock, MapPin, DollarSign, Star } from 'lucide-react'
import { Activity } from '@/lib/itinerary-validation'
import { motion, AnimatePresence } from 'framer-motion'

interface ActivityPopupProps {
  activity: Activity
  position: { x: number; y: number }
  onClose: () => void
}

export function ActivityPopup({ activity, position, onClose }: ActivityPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close popup on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'restaurant': return 'Restaurant'
      case 'attraction': return 'Attraction'
      case 'accommodation': return 'Hotel'
      case 'experience': return 'Experience'
      case 'transportation': return 'Transport'
      case 'shopping': return 'Shopping'
      default: return 'Activity'
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant': return 'bg-amber-100 text-amber-800'
      case 'attraction': return 'bg-red-100 text-red-800'
      case 'accommodation': return 'bg-purple-100 text-purple-800'
      case 'experience': return 'bg-emerald-100 text-emerald-800'
      case 'transportation': return 'bg-blue-100 text-blue-800'
      case 'shopping': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const time = new Date(`2000-01-01T${timeString}`)
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timeString
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Calculate popup position to keep it within viewport
  const calculatePosition = () => {
    const isMobile = window.innerWidth < 640
    const popupWidth = isMobile ? Math.min(300, window.innerWidth - 32) : 320
    const popupHeight = 280
    const padding = 16
    
    let x = position.x - popupWidth / 2
    let y = position.y - popupHeight - 16 // Position above the marker
    
    // Adjust horizontal position if popup would go off screen
    if (x < padding) {
      x = padding
    } else if (x + popupWidth > window.innerWidth - padding) {
      x = window.innerWidth - popupWidth - padding
    }
    
    // Adjust vertical position if popup would go off screen
    if (y < padding) {
      y = position.y + 40 // Position below the marker instead
    }
    
    return { x, y }
  }

  const finalPosition = calculatePosition()

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute z-50"
        style={{
          left: `${finalPosition.x}px`,
          top: `${finalPosition.y}px`,
          width: window.innerWidth < 640 ? `${Math.min(300, window.innerWidth - 32)}px` : '320px'
        }}
      >
        <Card className="bg-white shadow-lg border-0 overflow-hidden">
          {/* Popup Arrow */}
          <div 
            className="absolute w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"
            style={{
              left: `${position.x - finalPosition.x - 6}px`,
              bottom: finalPosition.y < position.y ? '-6px' : 'auto',
              top: finalPosition.y >= position.y ? '-6px' : 'auto'
            }}
          />
          
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${getActivityTypeColor(activity.type)}`}>
                    {getActivityTypeLabel(activity.type)}
                  </Badge>
                  {activity.rating !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{activity.rating}</span>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2">
                  {activity.name}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 h-6 w-6 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Description */}
            {activity.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                {activity.description}
              </p>
            )}

            {/* Activity Details */}
            <div className="space-y-2">
              {/* Time */}
              {(activity.startTime || activity.endTime) && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {activity.startTime && formatTime(activity.startTime)}
                    {activity.startTime && activity.endTime && ' - '}
                    {activity.endTime && formatTime(activity.endTime)}
                  </span>
                </div>
              )}

              {/* Location */}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 line-clamp-2">
                  {activity.location.address || activity.location.name || 'Location not specified'}
                </span>
              </div>

              {/* Price */}
              {activity.estimatedPrice !== undefined && activity.estimatedPrice > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">
                    {formatPrice(activity.estimatedPrice)}
                    {activity.priceCategory !== undefined && (
                      <span className="text-gray-400 ml-1">
                        ({activity.priceCategory})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Duration if available */}
            {activity.duration && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Duration: {activity.duration}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1 text-xs">
                View Details
              </Button>
              {activity.bookingUrl && (
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  Book Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

export default ActivityPopup