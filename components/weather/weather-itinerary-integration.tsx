"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WeatherCard } from './weather-card'
import { WeatherIcon, WeatherSeverityIndicator } from './weather-icon'
import { WeatherAlerts } from './weather-alerts'
import { Day, Activity } from '@/lib/itinerary-types'
import { 
  ProcessedWeather, 
  WeatherForecast, 
  WeatherImpact, 
  PackingList 
} from '@/lib/weather-types'
import { weatherActivityFilter } from '@/lib/weather-activity-filter'
import { packingListGenerator } from '@/lib/packing-list-generator'
import { getWeatherForecast } from '@/lib/weather-api'
import {
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Suitcase,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WeatherItineraryIntegrationProps {
  days: Day[]
  destination: {
    name: string
    coordinates: { lat: number; lng: number }
  }
  startDate: string
  endDate: string
  onActivityRecommendationChange?: (dayNumber: number, recommendations: string[]) => void
  className?: string
}

export function WeatherItineraryIntegration({
  days,
  destination,
  startDate,
  endDate,
  onActivityRecommendationChange,
  className = ''
}: WeatherItineraryIntegrationProps) {
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null)
  const [weatherImpacts, setWeatherImpacts] = useState<WeatherImpact[]>([])
  const [packingList, setPackingList] = useState<PackingList | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  // Fetch weather data
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

      // Generate weather impacts for each day
      const impacts = days.map(day => {
        const dayWeather = forecast.forecast.find(w => w.date === day.date)
        if (!dayWeather) return null

        return weatherActivityFilter.generateDayWeatherImpact(day, dayWeather)
      }).filter((impact): impact is WeatherImpact => impact !== null)

      setWeatherImpacts(impacts)

      // Generate packing list
      const packing = packingListGenerator.generatePackingList(
        destination.name,
        startDate,
        endDate,
        forecast,
        days
      )

      setPackingList(packing)

      // Notify parent of recommendations
      impacts.forEach(impact => {
        onActivityRecommendationChange?.(
          days.find(d => d.date === impact.date)?.day || 0,
          impact.recommendations
        )
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWeatherData()
  }, [destination.coordinates.lat, destination.coordinates.lng, days.length])

  const toggleDayExpanded = (dayNumber: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dayNumber)) {
        newSet.delete(dayNumber)
      } else {
        newSet.add(dayNumber)
      }
      return newSet
    })
  }

  const getOverallWeatherScore = () => {
    if (weatherImpacts.length === 0) return 0
    return Math.round(
      weatherImpacts.reduce((sum, impact) => sum + impact.overallSuitability, 0) / weatherImpacts.length
    )
  }

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (score >= 60) return <Minus className="h-4 w-4 text-yellow-600" />
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading weather information...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
          <p className="text-red-600 mb-3">{error}</p>
          <Button onClick={fetchWeatherData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!weatherForecast) {
    return null
  }

  const overallScore = getOverallWeatherScore()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Weather Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <CardTitle className="text-lg">Weather Overview</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {destination.name} • {days.length} days
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getScoreColor(overallScore)}`}>
                {getScoreIcon(overallScore)}
                <span className="font-semibold">{overallScore}/100</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Quick Weather Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {weatherForecast.forecast.filter(d => d.precipitation.probability > 50).length}
              </div>
              <div className="text-sm text-blue-800">Rainy Days</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((weatherForecast.forecast.reduce((sum, d) => sum + d.temperature.max, 0)) / weatherForecast.forecast.length)}°C
              </div>
              <div className="text-sm text-orange-800">Avg High</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {weatherForecast.forecast.filter(d => d.isExtreme).length}
              </div>
              <div className="text-sm text-red-800">Severe Days</div>
            </div>
          </div>

          {/* Weather Alerts */}
          <WeatherAlerts weatherData={weatherForecast.forecast} />
        </CardContent>
      </Card>

      {/* Daily Weather Impact */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {weatherImpacts.map((impact, index) => {
              const day = days.find(d => d.date === impact.date)
              const weather = weatherForecast.forecast.find(w => w.date === impact.date)
              const isExpanded = expandedDays.has(day?.day || 0)

              if (!day || !weather) return null

              return (
                <Card key={impact.date}>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleDayExpanded(day.day)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <h4 className="font-semibold">Day {day.day}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(impact.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <WeatherIcon condition={weather.condition} size="sm" />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-2 py-1 rounded ${getScoreColor(impact.overallSuitability)}`}>
                          {getScoreIcon(impact.overallSuitability)}
                          <span className="text-sm font-medium">{impact.overallSuitability}/100</span>
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          {impact.activities.filter(a => a.weatherImpact === 'negative').length} affected
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Weather Details */}
                            <div>
                              <h5 className="font-medium mb-3">Weather Conditions</h5>
                              <WeatherCard
                                weather={weather}
                                showDate={false}
                                compact={true}
                              />
                            </div>

                            {/* Activity Impact */}
                            <div>
                              <h5 className="font-medium mb-3">Activity Impact</h5>
                              <div className="space-y-2">
                                {impact.activities.map(activity => {
                                  const activityData = day.activities.find(a => a.id === activity.activityId)
                                  if (!activityData) return null

                                  return (
                                    <div key={activity.activityId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{activityData.name}</p>
                                        <p className="text-xs text-gray-600">
                                          {activity.reasons[0] || 'No weather impact'}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">{activity.suitabilityScore}/100</span>
                                        {activity.weatherImpact === 'positive' && <TrendingUp className="h-3 w-3 text-green-600" />}
                                        {activity.weatherImpact === 'negative' && <TrendingDown className="h-3 w-3 text-red-600" />}
                                        {activity.weatherImpact === 'neutral' && <Minus className="h-3 w-3 text-gray-600" />}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Recommendations */}
                          {impact.recommendations.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <h5 className="font-medium text-blue-800 mb-2">Recommendations</h5>
                              <ul className="text-sm text-blue-700 space-y-1">
                                {impact.recommendations.map((rec, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-blue-400 flex-shrink-0 mt-0.5">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Alerts */}
                          {impact.alerts.length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <h5 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Alerts
                              </h5>
                              <ul className="text-sm text-red-700 space-y-1">
                                {impact.alerts.map((alert, idx) => (
                                  <li key={idx}>{alert}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Packing List Preview */}
      {packingList && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Suitcase className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-lg">Weather-Based Packing List</CardTitle>
              </div>
              
              <Button variant="outline" size="sm">
                View Full List
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{packingList.weatherSummary}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['essential', 'recommended', 'optional'].map(priority => {
                const items = packingList.items.filter(item => item.priority === priority)
                if (items.length === 0) return null
                
                return (
                  <div key={priority}>
                    <h5 className="font-medium capitalize mb-2 flex items-center gap-2">
                      {priority === 'essential' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {priority === 'recommended' && <Minus className="h-4 w-4 text-yellow-600" />}
                      {priority === 'optional' && <XCircle className="h-4 w-4 text-gray-600" />}
                      {priority} ({items.length})
                    </h5>
                    <ul className="text-sm space-y-1">
                      {items.slice(0, 5).map((item, idx) => (
                        <li key={idx} className="text-gray-700">
                          {item.item}
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-gray-500 ml-1">({item.quantity})</span>
                          )}
                        </li>
                      ))}
                      {items.length > 5 && (
                        <li className="text-gray-500 text-xs">+{items.length - 5} more items</li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WeatherItineraryIntegration