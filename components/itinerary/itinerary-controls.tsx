"use client"

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TimelineConfig } from '@/lib/itinerary-types'
import {
  Calendar,
  Clock,
  DollarSign,
  Filter,
  Grid3X3,
  List,
  Settings,
  SortAsc,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface ItineraryControlsProps {
  config: TimelineConfig
  onConfigChange: (config: TimelineConfig) => void
}

export function ItineraryControls({
  config,
  onConfigChange
}: ItineraryControlsProps) {
  const [showFilters, setShowFilters] = useState(false)

  const handleViewModeChange = (viewMode: 'timeline' | 'cards') => {
    onConfigChange({ ...config, viewMode })
  }

  const handleSortChange = (sortBy: TimelineConfig['sortBy']) => {
    onConfigChange({ ...config, sortBy })
  }

  const handleFilterChange = (filterBy: Partial<TimelineConfig['filterBy']>) => {
    onConfigChange({
      ...config,
      filterBy: { ...config.filterBy, ...filterBy }
    })
  }

  const clearFilters = () => {
    onConfigChange({
      ...config,
      filterBy: {}
    })
  }

  const hasActiveFilters = Object.keys(config.filterBy).some(key => 
    config.filterBy[key as keyof typeof config.filterBy] !== undefined
  )

  const activityTypes = [
    { value: 'attraction', label: 'Attractions', icon: '🎯' },
    { value: 'restaurant', label: 'Restaurants', icon: '🍽️' },
    { value: 'experience', label: 'Experiences', icon: '⭐' },
    { value: 'transportation', label: 'Transportation', icon: '🚗' },
    { value: 'accommodation', label: 'Accommodation', icon: '🏨' }
  ]

  const timeSlots = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'evening', label: 'Evening' }
  ]

  const sortOptions = [
    { value: 'time', label: 'Time', icon: Clock },
    { value: 'type', label: 'Type', icon: Grid3X3 },
    { value: 'price', label: 'Price', icon: DollarSign }
  ]

  return (
    <div className="space-y-4">
      {/* Main controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">View:</Label>
            <div className="flex rounded-lg border border-gray-200 p-1">
              <Button
                variant={config.viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('cards')}
                className="px-3 py-1 h-8"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Cards
              </Button>
              <Button
                variant={config.viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('timeline')}
                className="px-3 py-1 h-8"
              >
                <List className="h-4 w-4 mr-1" />
                Timeline
              </Button>
            </div>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Sort:</Label>
            <Select value={config.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32 h-8">
                <div className="flex items-center gap-2">
                  {(() => {
                    const option = sortOptions.find(opt => opt.value === config.sortBy)
                    const Icon = option?.icon || Clock
                    return (
                      <>
                        <Icon className="h-3 w-3" />
                        <SelectValue />
                      </>
                    )
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {Object.keys(config.filterBy).length} filter(s)
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Expandable filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Clear all
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Activity type filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Activity Type</Label>
                  <Select
                    value={config.filterBy.type || 'all'}
                    onValueChange={(value) => 
                      handleFilterChange({ 
                        type: value === 'all' ? undefined : value as any
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
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
                </div>

                {/* Time slot filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Time Slot</Label>
                  <Select
                    value={config.filterBy.timeSlot || 'all'}
                    onValueChange={(value) => 
                      handleFilterChange({ 
                        timeSlot: value === 'all' ? undefined : value as any
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All times" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All times</SelectItem>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price range filter */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Price Range</Label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md"
                      value={config.filterBy.priceRange?.[0] || ''}
                      onChange={(e) => {
                        const min = parseFloat(e.target.value) || 0
                        const max = config.filterBy.priceRange?.[1] || 1000
                        handleFilterChange({ 
                          priceRange: min > 0 || max < 1000 ? [min, max] : undefined 
                        })
                      }}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md"
                      value={config.filterBy.priceRange?.[1] || ''}
                      onChange={(e) => {
                        const max = parseFloat(e.target.value) || 1000
                        const min = config.filterBy.priceRange?.[0] || 0
                        handleFilterChange({ 
                          priceRange: min > 0 || max < 1000 ? [min, max] : undefined 
                        })
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick filter buttons */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Filters</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={config.filterBy.type === 'restaurant' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => 
                      handleFilterChange({ 
                        type: config.filterBy.type === 'restaurant' ? undefined : 'restaurant' 
                      })
                    }
                  >
                    🍽️ Food & Drink
                  </Button>
                  <Button
                    variant={config.filterBy.type === 'attraction' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => 
                      handleFilterChange({ 
                        type: config.filterBy.type === 'attraction' ? undefined : 'attraction' 
                      })
                    }
                  >
                    🎯 Attractions
                  </Button>
                  <Button
                    variant={config.filterBy.priceRange?.[0] === 0 && config.filterBy.priceRange?.[1] === 0 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => 
                      handleFilterChange({ 
                        priceRange: (config.filterBy.priceRange?.[0] === 0 && config.filterBy.priceRange?.[1] === 0) 
                          ? undefined 
                          : [0, 0] 
                      })
                    }
                  >
                    💸 Free Activities
                  </Button>
                  <Button
                    variant={config.filterBy.timeSlot === 'morning' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => 
                      handleFilterChange({ 
                        timeSlot: config.filterBy.timeSlot === 'morning' ? undefined : 'morning' 
                      })
                    }
                  >
                    🌅 Morning
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show all days toggle */}
      <div className="flex items-center justify-between py-2 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Switch
            id="showAllDays"
            checked={config.showAllDays}
            onCheckedChange={(checked) => 
              onConfigChange({ ...config, showAllDays: checked })
            }
          />
          <Label htmlFor="showAllDays" className="text-sm">
            Show all days expanded by default
          </Label>
        </div>
        
        <div className="text-sm text-gray-600">
          {config.expandedDays.size} of {10} days expanded
        </div>
      </div>
    </div>
  )
}

export default ItineraryControls