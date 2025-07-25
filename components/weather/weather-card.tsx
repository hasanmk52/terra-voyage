"use client"

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeatherIcon, WeatherSeverityIndicator } from './weather-icon'
import { ProcessedWeather } from '@/lib/weather-types'
import { celsiusToFahrenheit } from '@/lib/weather-types'
import {
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Sunrise,
  Sunset,
  Calendar,
  AlertTriangle
} from 'lucide-react'

interface WeatherCardProps {
  weather: ProcessedWeather
  showDate?: boolean
  tempUnit?: 'celsius' | 'fahrenheit'
  compact?: boolean
  className?: string
}

export function WeatherCard({
  weather,
  showDate = true,
  tempUnit = 'celsius',
  compact = false,
  className = ''
}: WeatherCardProps) {
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

  const getPrecipitationText = () => {
    if (weather.precipitation.probability === 0) return 'No rain expected'
    if (weather.precipitation.type === 'snow') {
      return `${weather.precipitation.probability}% chance of snow`
    }
    return `${weather.precipitation.probability}% chance of rain`
  }

  if (compact) {
    return (
      <Card className={`${className} ${weather.isExtreme ? 'ring-2 ring-red-200' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WeatherIcon condition={weather.condition} size="sm" />
              <div>
                {showDate && (
                  <p className="text-xs text-gray-600 font-medium">
                    {formatDate(weather.date)}
                  </p>
                )}
                <p className="text-sm font-semibold">
                  {formatTemp(weather.temperature.max)}/{formatTemp(weather.temperature.min)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <WeatherSeverityIndicator severity={weather.condition.severity} />
                <span className="text-xs text-gray-600 capitalize">
                  {weather.condition.description}
                </span>
              </div>
              {weather.precipitation.probability > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {weather.precipitation.probability}% rain
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} ${weather.isExtreme ? 'ring-2 ring-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WeatherIcon condition={weather.condition} size="lg" />
            <div>
              {showDate && (
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatDate(weather.date)}
                  </span>
                </div>
              )}
              <h3 className="font-semibold text-lg capitalize">
                {weather.condition.description}
              </h3>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatTemp(weather.temperature.current)}
            </div>
            <div className="text-sm text-gray-600">
              {formatTemp(weather.temperature.max)}/{formatTemp(weather.temperature.min)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <WeatherSeverityIndicator severity={weather.condition.severity} />
              <Badge 
                variant={weather.condition.severity === 'severe' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {weather.condition.severity}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <span className="text-gray-600">Feels like:</span>
              <span className="font-medium">{formatTemp(weather.temperature.feelsLike)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Humidity:</span>
              <span className="font-medium">{weather.humidity}%</span>
            </div>
          </div>

          {/* Wind and visibility */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Wind className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Wind:</span>
              <span className="font-medium">
                {weather.wind.speed} km/h {weather.wind.direction}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">Visibility:</span>
              <span className="font-medium">{weather.visibility} km</span>
            </div>
          </div>
        </div>

        {/* Precipitation info */}
        {weather.precipitation.probability > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <Droplets className="h-4 w-4 inline mr-1" />
              {getPrecipitationText()}
              {weather.precipitation.amount > 0 && (
                <span className="ml-1">({weather.precipitation.amount}mm expected)</span>
              )}
            </p>
          </div>
        )}

        {/* Sunrise/sunset */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Sunrise className="h-4 w-4 text-yellow-500" />
            <span>{weather.sunrise}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Sunset className="h-4 w-4 text-orange-500" />
            <span>{weather.sunset}</span>
          </div>
        </div>

        {/* Weather alerts */}
        {weather.isExtreme && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Severe Weather Alert
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {weather.advisory || 'Extreme weather conditions expected. Plan indoor activities.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WeatherCard