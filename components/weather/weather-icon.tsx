"use client"

import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudDrizzle, 
  Eye, 
  EyeOff, 
  Wind,
  Thermometer,
  Droplets,
  Zap,
  AlertTriangle
} from 'lucide-react'
import { ProcessedWeather } from '@/lib/weather-types'

interface WeatherIconProps {
  condition: ProcessedWeather['condition']
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showBackground?: boolean
}

export function WeatherIcon({ 
  condition, 
  size = 'md', 
  className = '', 
  showBackground = true 
}: WeatherIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const getIconComponent = () => {
    const iconClass = sizeClasses[size]
    const main = condition.main.toLowerCase()
    const description = condition.description.toLowerCase()

    // Determine icon based on weather condition
    if (main === 'clear') {
      return <Sun className={`${iconClass} text-yellow-500`} />
    }
    
    if (main === 'clouds') {
      if (description.includes('few') || description.includes('scattered')) {
        return (
          <div className="relative">
            <Sun className={`${iconClass} text-yellow-400`} />
            <Cloud className={`${iconClass} absolute top-0 left-0 text-gray-400 opacity-60`} />
          </div>
        )
      }
      return <Cloud className={`${iconClass} text-gray-500`} />
    }
    
    if (main === 'rain') {
      if (description.includes('light') || description.includes('drizzle')) {
        return <CloudDrizzle className={`${iconClass} text-blue-500`} />
      }
      if (description.includes('heavy') || description.includes('shower')) {
        return <CloudRain className={`${iconClass} text-blue-600`} />
      }
      return <CloudRain className={`${iconClass} text-blue-500`} />
    }
    
    if (main === 'snow') {
      return <CloudSnow className={`${iconClass} text-blue-200`} />
    }
    
    if (main === 'thunderstorm') {
      return <CloudLightning className={`${iconClass} text-purple-600`} />
    }
    
    if (['mist', 'fog', 'haze', 'smoke'].some(cond => main.includes(cond))) {
      return <EyeOff className={`${iconClass} text-gray-400`} />
    }
    
    if (['dust', 'sand', 'ash'].some(cond => main.includes(cond))) {
      return <Wind className={`${iconClass} text-amber-600`} />
    }
    
    if (['tornado', 'squall'].some(cond => main.includes(cond))) {
      return <AlertTriangle className={`${iconClass} text-red-600`} />
    }
    
    // Default fallback
    return <Cloud className={`${iconClass} text-gray-500`} />
  }

  const getBackgroundColor = () => {
    if (!showBackground) return ''
    
    switch (condition.severity) {
      case 'severe':
        return 'bg-red-100 border-red-200'
      case 'moderate':
        return 'bg-yellow-100 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const backgroundClass = showBackground 
    ? `p-2 rounded-lg border ${getBackgroundColor()}` 
    : ''

  return (
    <div className={`inline-flex items-center justify-center ${backgroundClass} ${className}`}>
      {getIconComponent()}
    </div>
  )
}

// Animated weather icon for more dynamic displays
export function AnimatedWeatherIcon({ 
  condition, 
  size = 'md', 
  className = '' 
}: Omit<WeatherIconProps, 'showBackground'>) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const iconClass = sizeClasses[size]
  const main = condition.main.toLowerCase()

  return (
    <div className={`relative ${className}`}>
      <WeatherIcon condition={condition} size={size} showBackground={false} />
      
      {/* Add animated effects based on weather type */}
      {main === 'rain' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-2 bg-blue-400 opacity-60 animate-pulse"
              style={{
                left: `${20 + i * 20}%`,
                top: '60%',
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
      
      {main === 'snow' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-80 animate-bounce"
              style={{
                left: `${15 + i * 20}%`,
                top: '50%',
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2s'
              }}
            />
          ))}
        </div>
      )}
      
      {main === 'thunderstorm' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-purple-200 opacity-20 animate-pulse" />
        </div>
      )}
    </div>
  )
}

// Weather status indicator for severity
export function WeatherSeverityIndicator({ 
  severity, 
  size = 'sm' 
}: { 
  severity: ProcessedWeather['condition']['severity']
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const colorClasses = {
    mild: 'bg-green-500',
    moderate: 'bg-yellow-500',
    severe: 'bg-red-500'
  }

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[severity]} rounded-full flex-shrink-0`} />
  )
}

export default WeatherIcon