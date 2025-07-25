"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WeatherCard } from './weather-card'
import { WeatherIcon } from './weather-icon'
import { ProcessedWeather, WeatherForecast } from '@/lib/weather-types'
import { celsiusToFahrenheit } from '@/lib/weather-types'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
  Calendar,
  Thermometer,
  CloudRain
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WeatherForecastProps {
  forecast: WeatherForecast
  onRefresh?: () => void
  isLoading?: boolean
  tempUnit?: 'celsius' | 'fahrenheit'
  className?: string
}

export function WeatherForecastDisplay({
  forecast,
  onRefresh,
  isLoading = false,
  tempUnit = 'celsius',
  className = ''
}: WeatherForecastProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [view, setView] = useState<'overview' | 'detailed'>('overview')

  const formatTemp = (temp: number) => {
    const value = tempUnit === 'fahrenheit' ? celsiusToFahrenheit(temp) : temp
    const unit = tempUnit === 'fahrenheit' ? '°F' : '°C'
    return `${value}${unit}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const getWeatherSummary = () => {
    const rainyDays = forecast.forecast.filter(day => day.precipitation.probability > 50).length
    const hotDays = forecast.forecast.filter(day => day.temperature.max > 30).length
    const coldDays = forecast.forecast.filter(day => day.temperature.max < 10).length
    const extremeDays = forecast.forecast.filter(day => day.isExtreme).length

    const summary = []
    if (extremeDays > 0) summary.push(`${extremeDays} severe weather day${extremeDays > 1 ? 's' : ''}`)
    if (rainyDays > 0) summary.push(`${rainyDays} rainy day${rainyDays > 1 ? 's' : ''}`)
    if (hotDays > 0) summary.push(`${hotDays} hot day${hotDays > 1 ? 's' : ''}`)
    if (coldDays > 0) summary.push(`${coldDays} cold day${coldDays > 1 ? 's' : ''}`)

    return summary.length > 0 ? summary.join(', ') : 'Generally pleasant weather expected'
  }

  if (view === 'detailed') {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => setView('overview')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Overview
          </Button>
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        <WeatherCard
          weather={forecast.forecast[selectedDay]}
          showDate={true}
          tempUnit={tempUnit}
          compact={false}
        />

        {/* Day navigation */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
            disabled={selectedDay === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[100px] text-center">
            Day {selectedDay + 1} of {forecast.forecast.length}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDay(Math.min(forecast.forecast.length - 1, selectedDay + 1))}
            disabled={selectedDay === forecast.forecast.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle className="text-lg">
                {forecast.location.name}, {forecast.location.country}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {getWeatherSummary()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Current weather highlight */}
        <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WeatherIcon condition={forecast.current.condition} size="lg" />
              <div>
                <h3 className="font-semibold text-lg">Right Now</h3>
                <p className="text-sm text-gray-600 capitalize">
                  {forecast.current.condition.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {formatTemp(forecast.current.temperature.current)}
              </div>
              <div className="text-sm text-gray-600">
                Feels like {formatTemp(forecast.current.temperature.feelsLike)}
              </div>
            </div>
          </div>
        </div>

        {/* 7-day forecast scroll */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              10-Day Forecast
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('detailed')}
              className="text-xs"
            >
              View Details
            </Button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            <AnimatePresence>
              {forecast.forecast.map((day, index) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedDay(index)
                    setView('detailed')
                  }}
                >
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <WeatherIcon condition={day.condition} size="sm" showBackground={false} />
                      <div>
                        <p className="font-medium text-sm">
                          {formatDate(day.date)}
                        </p>
                        <p className="text-xs text-gray-600 capitalize">
                          {day.condition.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      {day.precipitation.probability > 0 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <CloudRain className="h-3 w-3" />
                          <span>{day.precipitation.probability}%</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-gray-500" />
                        <span className="font-medium">
                          {formatTemp(day.temperature.max)}/{formatTemp(day.temperature.min)}
                        </span>
                      </div>
                      
                      {day.isExtreme && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Last updated info */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Last updated: {new Date(forecast.lastUpdated).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default WeatherForecastDisplay