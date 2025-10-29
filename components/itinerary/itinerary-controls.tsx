"use client"

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { TimelineConfig } from '@/lib/itinerary-types'
import {
  Clock,
  DollarSign,
  Filter,
  Grid3X3,
  List,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface ItineraryControlsProps {
  config: TimelineConfig
  onConfigChange: (config: TimelineConfig) => void
  totalDays: number
}

export function ItineraryControls({
  config,
  onConfigChange,
  totalDays
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
    <div className="space-y-6 relative">
      {/* Main controls */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">View:</Label>
            <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
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
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
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
        <div className="flex flex-wrap items-center gap-2">
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
            <div className="bg-gray-50 rounded-lg p-6 space-y-6 border border-gray-200 relative">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <SelectTrigger className="w-full h-10">
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
                    <SelectTrigger className="w-full h-10">
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
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      placeholder="Min"
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={config.filterBy.priceRange?.[0] || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        const min = value === '' ? 0 : Math.max(0, Math.min(100000, parseFloat(value) || 0))
                        const max = config.filterBy.priceRange?.[1] || 1000
                        handleFilterChange({ 
                          priceRange: min > 0 || max < 1000 ? [min, max] : undefined 
                        })
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      placeholder="Max"
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      value={config.filterBy.priceRange?.[1] || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        const max = value === '' ? 1000 : Math.max(0, Math.min(100000, parseFloat(value) || 1000))
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
              <div className="space-y-3">
                <Label className="text-sm font-medium">Quick Filters</Label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={config.filterBy.type === 'restaurant' ? 'default' : 'outline'}
                    size="sm"
                    className={`transition-all duration-200 ${
                      config.filterBy.type === 'restaurant' 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200 scale-105' 
                        : 'hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                    }`}
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
                    className={`transition-all duration-200 ${
                      config.filterBy.type === 'attraction' 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200 scale-105' 
                        : 'hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                    }`}
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
                    className={`transition-all duration-200 ${
                      config.filterBy.priceRange?.[0] === 0 && config.filterBy.priceRange?.[1] === 0 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200 scale-105' 
                        : 'hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                    }`}
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
                    className={`transition-all duration-200 ${
                      config.filterBy.timeSlot === 'morning' 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200 scale-105' 
                        : 'hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
                    }`}
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

      {/* Show all days toggle - Bootstrap 5 style */}
      <div className="flex items-center justify-between py-5 px-6 bg-gradient-to-r from-white to-blue-50/30 rounded-xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
        <div className="flex items-center gap-4">
          {/* Custom Bootstrap-style toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showAllDays"
              checked={config.showAllDays}
              onChange={(e) => 
                onConfigChange({ ...config, showAllDays: e.target.checked })
              }
              className="sr-only"
            />
            <label
              htmlFor="showAllDays"
              className={`relative inline-flex items-center h-6 w-11 cursor-pointer rounded-full border-2 transition-all duration-300 ease-in-out focus-within:ring-4 focus-within:ring-blue-200 ${
                config.showAllDays
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-gray-200 border-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out ${
                  config.showAllDays ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
              {/* Optional ON/OFF text */}
              <span
                className={`absolute inset-0 flex items-center justify-center text-xs font-bold transition-opacity duration-200 ${
                  config.showAllDays ? 'text-white' : 'text-gray-500'
                }`}
                style={{ 
                  fontSize: '8px',
                  left: config.showAllDays ? '2px' : 'auto',
                  right: config.showAllDays ? 'auto' : '2px'
                }}
              >
                {config.showAllDays ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
          
          <div className="flex flex-col">
            <Label htmlFor="showAllDays" className="text-base font-semibold cursor-pointer hover:text-blue-700 transition-colors text-gray-900">
              Show all days expanded
            </Label>
            <p className="text-sm text-gray-500 mt-0.5">Automatically expand all day cards when loading</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${config.showAllDays ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="font-medium">{config.expandedDays.size} of {totalDays} expanded</span>
        </div>
      </div>
    </div>
  )
}

export default ItineraryControls