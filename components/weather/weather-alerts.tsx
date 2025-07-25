"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WeatherAlert, ProcessedWeather } from '@/lib/weather-types'
import { generateId } from '@/lib/utils'
import {
  AlertTriangle,
  CloudRain,
  Thermometer,
  Wind,
  Eye,
  X,
  Bell,
  BellOff,
  Info,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WeatherAlertsProps {
  weatherData: ProcessedWeather[]
  onDismissAlert?: (alertId: string) => void
  className?: string
}

export function WeatherAlerts({
  weatherData,
  onDismissAlert,
  className = ''
}: WeatherAlertsProps) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([])
  const [showDismissed, setShowDismissed] = useState(false)

  // Generate alerts based on weather data
  useEffect(() => {
    const generatedAlerts = generateWeatherAlerts(weatherData)
    setAlerts(generatedAlerts)
  }, [weatherData])

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ))
    onDismissAlert?.(alertId)
  }

  const activeAlerts = alerts.filter(alert => !alert.dismissed)
  const dismissedAlerts = alerts.filter(alert => alert.dismissed)

  const getAlertIcon = (type: WeatherAlert['type']) => {
    switch (type) {
      case 'temperature': return <Thermometer className="h-4 w-4" />
      case 'precipitation': return <CloudRain className="h-4 w-4" />
      case 'wind': return <Wind className="h-4 w-4" />
      case 'visibility': return <Eye className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'severe': return 'border-red-500 bg-red-50 text-red-800'
      case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800'
      case 'info': return 'border-blue-500 bg-blue-50 text-blue-800'
    }
  }

  const getSeverityBadge = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'severe': return <Badge className="bg-red-600 text-white">Severe</Badge>
      case 'warning': return <Badge className="bg-yellow-600 text-white">Warning</Badge>
      case 'info': return <Badge className="bg-blue-600 text-white">Info</Badge>
    }
  }

  if (activeAlerts.length === 0 && dismissedAlerts.length === 0) {
    return (
      <div className={`${className} p-4 text-center text-gray-500`}>
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No weather alerts at this time</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            Weather Alerts ({activeAlerts.length})
          </h3>
          
          <AnimatePresence>
            {activeAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getAlertIcon(alert.type)}
                        <div>
                          <CardTitle className="text-base">{alert.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getSeverityBadge(alert.severity)}
                            <span className="text-xs text-gray-600">
                              {alert.affectedDays.length} day{alert.affectedDays.length > 1 ? 's' : ''} affected
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissAlert(alert.id)}
                        className="p-1 h-6 w-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-700 mb-3">{alert.description}</p>
                    
                    {/* Affected dates */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Affected Dates:</p>
                      <div className="flex flex-wrap gap-1">
                        {alert.affectedDays.slice(0, 5).map(date => {
                          const dateObj = new Date(date)
                          const today = new Date()
                          const isToday = dateObj.toDateString() === today.toDateString()
                          const tomorrow = new Date(today)
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          const isTomorrow = dateObj.toDateString() === tomorrow.toDateString()
                          
                          const displayDate = isToday ? 'Today' : 
                                            isTomorrow ? 'Tomorrow' :
                                            dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          
                          return (
                            <Badge key={date} variant="outline" className="text-xs">
                              {displayDate}
                            </Badge>
                          )
                        })}
                        {alert.affectedDays.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{alert.affectedDays.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Recommendations */}
                    {alert.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Recommendations:</p>
                        <ul className="text-xs text-gray-700 space-y-1">
                          {alert.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-gray-400 flex-shrink-0">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dismissed Alerts Toggle */}
      {dismissedAlerts.length > 0 && (
        <div className={`${activeAlerts.length > 0 ? 'mt-6 pt-4 border-t border-gray-200' : ''}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDismissed(!showDismissed)}
            className="flex items-center gap-2 text-gray-600"
          >
            <BellOff className="h-4 w-4" />
            {showDismissed ? 'Hide' : 'Show'} Dismissed Alerts ({dismissedAlerts.length})
          </Button>
          
          <AnimatePresence>
            {showDismissed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 space-y-2"
              >
                {dismissedAlerts.map((alert) => (
                  <Card key={alert.id} className="border border-gray-200 opacity-60">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getAlertIcon(alert.type)}
                          <div>
                            <p className="text-sm font-medium text-gray-700">{alert.title}</p>
                            <p className="text-xs text-gray-500">Dismissed</p>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAlerts(prev => prev.map(a => 
                            a.id === alert.id ? { ...a, dismissed: false } : a
                          ))}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// Function to generate weather alerts from weather data
export function generateWeatherAlerts(weatherData: ProcessedWeather[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  
  weatherData.forEach((day, index) => {
    const date = day.date
    
    // Extreme temperature alerts
    if (day.temperature.max > 35) {
      alerts.push({
        id: generateId(),
        type: 'temperature',
        severity: 'severe',
        title: 'Extreme Heat Warning',
        description: `Dangerous heat levels expected with temperatures reaching ${day.temperature.max}°C. Risk of heat exhaustion and dehydration.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Avoid outdoor activities during peak hours (10 AM - 4 PM)',
          'Stay hydrated and seek air-conditioned spaces',
          'Wear light-colored, loose-fitting clothing',
          'Use sunscreen and wear a hat when outdoors'
        ],
        dismissed: false
      })
    } else if (day.temperature.max > 30) {
      alerts.push({
        id: generateId(),
        type: 'temperature',
        severity: 'warning',
        title: 'Hot Weather Advisory',
        description: `High temperatures of ${day.temperature.max}°C expected. Take precautions to stay cool.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Stay hydrated throughout the day',
          'Plan outdoor activities for early morning or evening',
          'Wear lightweight, breathable clothing'
        ],
        dismissed: false
      })
    }
    
    if (day.temperature.min < -10) {
      alerts.push({
        id: generateId(),
        type: 'temperature',
        severity: 'severe',
        title: 'Extreme Cold Warning',
        description: `Dangerously cold temperatures of ${day.temperature.min}°C expected. Risk of frostbite and hypothermia.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Limit time outdoors and dress in warm layers',
          'Cover all exposed skin',
          'Keep extremities warm with proper gloves and hats',
          'Be aware of signs of frostbite and hypothermia'
        ],
        dismissed: false
      })
    } else if (day.temperature.min < 0) {
      alerts.push({
        id: generateId(),
        type: 'temperature',
        severity: 'warning',
        title: 'Freezing Temperature Alert',
        description: `Temperatures dropping to ${day.temperature.min}°C. Icy conditions possible.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Watch for icy surfaces when walking',
          'Dress warmly in layers',
          'Protect exposed skin from wind and cold'
        ],
        dismissed: false
      })
    }
    
    // Precipitation alerts
    if (day.precipitation.probability > 80 && day.precipitation.amount > 20) {
      alerts.push({
        id: generateId(),
        type: 'precipitation',
        severity: 'severe',
        title: 'Heavy Rain Warning',
        description: `Heavy rainfall expected with ${day.precipitation.amount}mm of rain and ${day.precipitation.probability}% probability. Flooding possible.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Avoid low-lying areas prone to flooding',
          'Carry waterproof protection for electronics',
          'Allow extra time for transportation',
          'Consider indoor activities as alternatives'
        ],
        dismissed: false
      })
    } else if (day.precipitation.probability > 70) {
      alerts.push({
        id: generateId(),
        type: 'precipitation',
        severity: 'warning',
        title: 'Rain Expected',
        description: `High chance of rain (${day.precipitation.probability}%) with up to ${day.precipitation.amount}mm expected.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Carry an umbrella or rain jacket',
          'Wear appropriate footwear',
          'Have backup indoor activities planned'
        ],
        dismissed: false
      })
    }
    
    // Snow alerts
    if (day.precipitation.type === 'snow' && day.precipitation.amount > 10) {
      alerts.push({
        id: generateId(),
        type: 'precipitation',
        severity: 'warning',
        title: 'Heavy Snow Expected',
        description: `Significant snowfall expected. Travel conditions may be affected.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Wear appropriate winter footwear',
          'Allow extra time for travel',
          'Be cautious of slippery surfaces',
          'Keep warm and dry'
        ],
        dismissed: false
      })
    }
    
    // Wind alerts
    if (day.wind.speed > 50) {
      alerts.push({
        id: generateId(),
        type: 'wind',
        severity: 'severe',
        title: 'High Wind Warning',
        description: `Dangerous wind speeds of ${day.wind.speed} km/h expected. Risk of falling objects and difficult travel conditions.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Avoid areas with tall trees or unstable structures',
          'Secure loose outdoor items',
          'Be extra cautious when walking or driving',
          'Consider indoor activities'
        ],
        dismissed: false
      })
    } else if (day.wind.speed > 30) {
      alerts.push({
        id: generateId(),
        type: 'wind',
        severity: 'warning',
        title: 'Strong Wind Advisory',
        description: `Strong winds of ${day.wind.speed} km/h expected. Outdoor activities may be affected.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Secure loose items and clothing',
          'Be cautious when opening doors or walking near buildings',
          'Consider indoor alternatives for some activities'
        ],
        dismissed: false
      })
    }
    
    // Visibility alerts
    if (day.visibility < 1) {
      alerts.push({
        id: generateId(),
        type: 'visibility',
        severity: 'severe',
        title: 'Dense Fog Warning',
        description: `Very poor visibility (${day.visibility}km) due to fog or other conditions. Travel may be dangerous.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Allow extra time for travel',
          'Use extra caution when walking or driving',
          'Stay close to familiar areas',
          'Consider postponing travel if possible'
        ],
        dismissed: false
      })
    } else if (day.visibility < 3) {
      alerts.push({
        id: generateId(),
        type: 'visibility',
        severity: 'warning',
        title: 'Reduced Visibility',
        description: `Limited visibility (${day.visibility}km) may affect outdoor activities and travel.`,
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Use extra caution when traveling',
          'Stay alert to your surroundings',
          'Consider activities that don\'t rely on distant views'
        ],
        dismissed: false
      })
    }
    
    // General extreme weather
    if (day.isExtreme && !alerts.some(alert => alert.affectedDays.includes(date) && alert.severity === 'severe')) {
      alerts.push({
        id: generateId(),
        type: 'general',
        severity: 'severe',
        title: 'Severe Weather Conditions',
        description: 'Multiple severe weather conditions expected. Exercise extreme caution.',
        startDate: date,
        affectedDays: [date],
        recommendations: [
          'Monitor weather updates closely',
          'Prioritize indoor activities',
          'Have emergency contact information ready',
          'Consider modifying travel plans'
        ],
        dismissed: false
      })
    }
  })
  
  // Merge consecutive day alerts
  return mergeConsecutiveAlerts(alerts)
}

// Helper function to merge alerts for consecutive days
function mergeConsecutiveAlerts(alerts: WeatherAlert[]): WeatherAlert[] {
  const groupedAlerts = new Map<string, WeatherAlert[]>()
  
  // Group similar alerts
  alerts.forEach(alert => {
    const key = `${alert.type}_${alert.severity}_${alert.title}`
    if (!groupedAlerts.has(key)) {
      groupedAlerts.set(key, [])
    }
    groupedAlerts.get(key)!.push(alert)
  })
  
  const mergedAlerts: WeatherAlert[] = []
  
  groupedAlerts.forEach(alertGroup => {
    if (alertGroup.length === 1) {
      mergedAlerts.push(alertGroup[0])
    } else {
      // Check if dates are consecutive
      const dates = alertGroup.map(a => a.affectedDays[0]).sort()
      const isConsecutive = dates.every((date, index) => {
        if (index === 0) return true
        const prevDate = new Date(dates[index - 1])
        const currentDate = new Date(date)
        const diffTime = currentDate.getTime() - prevDate.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays <= 1
      })
      
      if (isConsecutive) {
        // Merge into single alert
        const firstAlert = alertGroup[0]
        mergedAlerts.push({
          ...firstAlert,
          id: generateId(),
          affectedDays: dates,
          startDate: dates[0],
          endDate: dates[dates.length - 1],
          description: `${firstAlert.description} Expected for ${dates.length} consecutive days.`
        })
      } else {
        // Keep separate
        mergedAlerts.push(...alertGroup)
      }
    }
  })
  
  // Sort by severity and start date
  return mergedAlerts.sort((a, b) => {
    const severityOrder = { severe: 0, warning: 1, info: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return a.startDate.localeCompare(b.startDate)
  })
}

export default WeatherAlerts