"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Day } from '@/lib/itinerary-types'
import { ProcessedWeather, WeatherForecast } from '@/lib/weather-types'
import { getWeatherForecast } from '@/lib/weather-api'
import {
  Calendar,
  MapPin,
  CloudRain,
  Sun,
  Cloud,
  Thermometer,
  Wind,
  Eye,
  Droplets,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Umbrella
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WeatherSidebarProps {
  days: Day[]
  destination: {
    name: string
    coordinates: { lat: number; lng: number }
  }
  startDate: string
  endDate: string
  className?: string
}

const getWeatherIcon = (condition: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }
  
  const iconClass = sizeClasses[size]
  
  if (condition.includes('rain')) return <CloudRain className={`${iconClass} text-blue-500`} />
  if (condition.includes('clear')) return <Sun className={`${iconClass} text-yellow-500`} />
  if (condition.includes('cloud')) return <Cloud className={`${iconClass} text-gray-500`} />
  return <Sun className={`${iconClass} text-yellow-500`} />
}

const getTemperatureColor = (temp: number) => {
  if (temp >= 25) return 'text-red-500'
  if (temp >= 15) return 'text-orange-500'
  if (temp >= 5) return 'text-blue-500'
  return 'text-blue-700'
}

export function WeatherSidebar({
  days,
  destination,
  startDate,
  endDate,
  className = ''
}: WeatherSidebarProps) {
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetailedForecast, setShowDetailedForecast] = useState(false)

  const fetchWeatherData = async () => {
    if (!destination.coordinates.lat || !destination.coordinates.lng) return

    setIsLoading(true)
    setError(null)

    try {
      const forecast = await getWeatherForecast(
        destination.coordinates.lat,
        destination.coordinates.lng,
        destination.name
      )
      setWeatherForecast(forecast)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWeatherData()
  }, [destination.coordinates.lat, destination.coordinates.lng])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-blue-500" />
          <p className="text-sm text-gray-600">Loading weather...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-6 w-6 mx-auto mb-3 text-red-500" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button onClick={fetchWeatherData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!weatherForecast) return null

  const currentWeather = weatherForecast.current
  const forecast = weatherForecast.forecast.slice(0, days.length)
  const rainyDays = forecast.filter(d => d.precipitation.probability > 40).length
  const avgTemp = Math.round(forecast.reduce((sum, d) => sum + d.temperature.max, 0) / forecast.length)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Weather Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-base">{destination.name}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getWeatherIcon(currentWeather.condition.description, 'lg')}
              <div>
                <div className={`text-2xl font-bold ${getTemperatureColor(currentWeather.temperature.current)}`}>
                  {currentWeather.temperature.current}°C
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {currentWeather.condition.description}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Thermometer className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Feels like</span>
              <span className="font-medium">{currentWeather.temperature.feelsLike}°C</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Wind className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Wind</span>
              <span className="font-medium">{currentWeather.wind.speed} km/h</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Droplets className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Humidity</span>
              <span className="font-medium">{currentWeather.humidity}%</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Eye className="h-3 w-3 text-gray-500" />
              <span className="text-gray-600">Visibility</span>
              <span className="font-medium">{currentWeather.visibility} km</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Weather Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Trip Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{rainyDays}</div>
              <div className="text-xs text-blue-800">Rainy Days</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{avgTemp}°C</div>
              <div className="text-xs text-orange-800">Avg High</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{days.length}</div>
              <div className="text-xs text-green-800">Trip Days</div>
            </div>
          </div>

          {/* Weather Recommendation */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              {rainyDays > days.length / 2 ? (
                <Umbrella className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Sun className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-800 mb-1">
                  {rainyDays > days.length / 2 ? 'Pack for Rain' : 'Great Weather Ahead'}
                </div>
                <div className="text-xs text-gray-600">
                  {rainyDays > days.length / 2 
                    ? `${rainyDays} rainy days expected. Don't forget your umbrella and waterproof clothing.`
                    : `Mostly clear skies with ${rainyDays} rainy days. Perfect for outdoor activities.`
                  }
                </div>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDetailedForecast(!showDetailedForecast)}
            className="w-full"
          >
            {showDetailedForecast ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Daily Forecast
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show Daily Forecast
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Detailed Daily Forecast */}
      <AnimatePresence>
        {showDetailedForecast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Daily Forecast</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {forecast.map((weather, index) => {
                    const day = days[index]
                    if (!day) return null
                    
                    return (
                      <div key={weather.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-600">Day {day.day}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(weather.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                          {getWeatherIcon(weather.condition.description)}
                          <div>
                            <div className="text-sm font-medium capitalize">
                              {weather.condition.description}
                            </div>
                            <div className="text-xs text-gray-600">
                              {weather.precipitation.probability > 40 && (
                                <span className="flex items-center gap-1">
                                  <Droplets className="h-3 w-3" />
                                  {weather.precipitation.probability}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${getTemperatureColor(weather.temperature.max)}`}>
                            {weather.temperature.max}°
                          </div>
                          <div className="text-xs text-gray-500">
                            {weather.temperature.min}°
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WeatherSidebar