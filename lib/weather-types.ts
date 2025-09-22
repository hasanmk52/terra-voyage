import { z } from 'zod'

// OpenWeatherMap API response schemas
export const weatherConditionSchema = z.object({
  id: z.number(),
  main: z.string(), // e.g., "Rain", "Snow", "Clear"
  description: z.string(), // e.g., "light rain", "clear sky"
  icon: z.string() // e.g., "10d", "01n"
})

export const weatherMainSchema = z.object({
  temp: z.number(), // Temperature in Kelvin
  feels_like: z.number(),
  temp_min: z.number(),
  temp_max: z.number(),
  pressure: z.number(), // hPa
  humidity: z.number(), // %
  sea_level: z.number().optional(),
  grnd_level: z.number().optional()
})

export const weatherWindSchema = z.object({
  speed: z.number(), // m/s
  deg: z.number(), // degrees
  gust: z.number().optional()
})

export const weatherCloudsSchema = z.object({
  all: z.number() // % cloudiness
})

export const weatherRainSchema = z.object({
  '1h': z.number().optional(), // mm
  '3h': z.number().optional()
})

export const weatherSnowSchema = z.object({
  '1h': z.number().optional(), // mm
  '3h': z.number().optional()
})

export const currentWeatherSchema = z.object({
  coord: z.object({
    lon: z.number(),
    lat: z.number()
  }),
  weather: z.array(weatherConditionSchema),
  base: z.string(),
  main: weatherMainSchema,
  visibility: z.number().optional(),
  wind: weatherWindSchema.optional(),
  clouds: weatherCloudsSchema,
  rain: weatherRainSchema.optional(),
  snow: weatherSnowSchema.optional(),
  dt: z.number(), // Unix timestamp
  sys: z.object({
    type: z.number().optional(),
    id: z.number().optional(),
    country: z.string(),
    sunrise: z.number(),
    sunset: z.number()
  }),
  timezone: z.number(),
  id: z.number(),
  name: z.string(),
  cod: z.number()
})

export const forecastItemSchema = z.object({
  dt: z.number(), // Unix timestamp
  main: weatherMainSchema,
  weather: z.array(weatherConditionSchema),
  clouds: weatherCloudsSchema,
  wind: weatherWindSchema.optional(),
  visibility: z.number().optional(),
  pop: z.number(), // Probability of precipitation (0-1)
  rain: weatherRainSchema.optional(),
  snow: weatherSnowSchema.optional(),
  sys: z.object({
    pod: z.string() // "d" for day, "n" for night
  }),
  dt_txt: z.string() // "2023-01-01 12:00:00"
})

export const forecastResponseSchema = z.object({
  cod: z.string(),
  message: z.number(),
  cnt: z.number(), // Number of forecast items
  list: z.array(forecastItemSchema),
  city: z.object({
    id: z.number(),
    name: z.string(),
    coord: z.object({
      lat: z.number(),
      lon: z.number()
    }),
    country: z.string(),
    population: z.number().optional(),
    timezone: z.number(),
    sunrise: z.number(),
    sunset: z.number()
  })
})

// Our processed weather data types
export const processedWeatherSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  temperature: z.object({
    current: z.number(), // Celsius
    min: z.number(),
    max: z.number(),
    feelsLike: z.number()
  }),
  condition: z.object({
    main: z.string(),
    description: z.string(),
    icon: z.string(),
    severity: z.enum(['mild', 'moderate', 'severe']) // Our categorization
  }),
  precipitation: z.object({
    probability: z.number(), // 0-100%
    amount: z.number(), // mm
    type: z.enum(['none', 'rain', 'snow', 'mixed']).optional()
  }),
  wind: z.object({
    speed: z.number(), // km/h
    direction: z.string(), // N, NE, E, SE, S, SW, W, NW
    gust: z.number().optional()
  }),
  humidity: z.number(), // %
  visibility: z.number(), // km
  uvIndex: z.number().optional(), // 0-11+
  sunrise: z.string(), // HH:MM
  sunset: z.string(), // HH:MM
  isExtreme: z.boolean(), // For weather alerts
  advisory: z.string().optional() // Weather advisory text
})

export const weatherForecastSchema = z.object({
  location: z.object({
    name: z.string(),
    country: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    })
  }),
  current: processedWeatherSchema,
  forecast: z.array(processedWeatherSchema),
  lastUpdated: z.string(), // ISO timestamp
  source: z.enum(['openweathermap', 'weatherapi', 'historical', 'mock'])
})

// Activity suitability types
export const activitySuitabilitySchema = z.object({
  activityId: z.string(),
  suitabilityScore: z.number(), // 0-100
  reasons: z.array(z.string()),
  alternatives: z.array(z.string()).optional(),
  weatherImpact: z.enum(['positive', 'neutral', 'negative'])
})

export const weatherImpactSchema = z.object({
  date: z.string(),
  overallSuitability: z.number(), // 0-100
  activities: z.array(activitySuitabilitySchema),
  recommendations: z.array(z.string()),
  alerts: z.array(z.string())
})

// Packing list types
export const packingItemSchema = z.object({
  item: z.string(),
  category: z.enum(['clothing', 'accessories', 'equipment', 'personal', 'documents']),
  priority: z.enum(['essential', 'recommended', 'optional']),
  reason: z.string(),
  quantity: z.number().optional(),
  alternatives: z.array(z.string()).optional()
})

export const packingListSchema = z.object({
  destination: z.string(),
  travelDates: z.object({
    start: z.string(),
    end: z.string()
  }),
  weatherSummary: z.string(),
  items: z.array(packingItemSchema),
  generalTips: z.array(z.string()),
  lastUpdated: z.string()
})

// Weather alert types
export const weatherAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['temperature', 'precipitation', 'wind', 'visibility', 'general']),
  severity: z.enum(['info', 'warning', 'severe']),
  title: z.string(),
  description: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  affectedDays: z.array(z.string()), // Array of YYYY-MM-DD dates
  recommendations: z.array(z.string()),
  dismissed: z.boolean().default(false)
})

// Type exports
export type WeatherCondition = z.infer<typeof weatherConditionSchema>
export type CurrentWeather = z.infer<typeof currentWeatherSchema>
export type ForecastResponse = z.infer<typeof forecastResponseSchema>
export type ForecastItem = z.infer<typeof forecastItemSchema>
export type ProcessedWeather = z.infer<typeof processedWeatherSchema>
export type WeatherForecast = z.infer<typeof weatherForecastSchema>
export type ActivitySuitability = z.infer<typeof activitySuitabilitySchema>
export type WeatherImpact = z.infer<typeof weatherImpactSchema>
export type PackingItem = z.infer<typeof packingItemSchema>
export type PackingList = z.infer<typeof packingListSchema>
export type WeatherAlert = z.infer<typeof weatherAlertSchema>

// Weather condition categorization
export const WEATHER_CATEGORIES = {
  CLEAR: ['clear sky', 'few clouds'],
  PARTLY_CLOUDY: ['scattered clouds', 'broken clouds'],
  CLOUDY: ['overcast clouds'],
  LIGHT_RAIN: ['light rain', 'light intensity drizzle', 'drizzle'],
  MODERATE_RAIN: ['moderate rain', 'heavy intensity drizzle'],
  HEAVY_RAIN: ['heavy intensity rain', 'very heavy rain', 'extreme rain'],
  THUNDERSTORM: ['thunderstorm with light rain', 'thunderstorm with rain', 'thunderstorm with heavy rain', 'light thunderstorm', 'thunderstorm', 'heavy thunderstorm'],
  SNOW: ['light snow', 'snow', 'heavy snow', 'sleet', 'light shower sleet', 'shower sleet'],
  FOG: ['mist', 'smoke', 'haze', 'sand/dust whirls', 'fog', 'sand', 'dust', 'volcanic ash', 'squalls'],
  EXTREME: ['tornado', 'tropical storm', 'hurricane', 'cold', 'hot', 'windy', 'hail']
} as const

// Activity indoor/outdoor classification
export const ACTIVITY_OUTDOOR_CLASSIFICATION = {
  outdoor: [
    'park', 'garden', 'beach', 'hiking', 'walking', 'cycling', 'outdoor market',
    'street food', 'monument', 'viewpoint', 'bridge', 'square', 'stadium',
    'zoo', 'theme park', 'festival', 'concert outdoor', 'boat trip', 'safari'
  ],
  indoor: [
    'museum', 'gallery', 'theater', 'cinema', 'shopping mall', 'restaurant',
    'cafe', 'bar', 'church', 'cathedral', 'library', 'aquarium', 'spa',
    'indoor market', 'concert hall', 'exhibition', 'workshop', 'class'
  ],
  mixed: [
    'tour', 'sightseeing', 'food tour', 'city walk', 'market visit',
    'cultural experience', 'photography', 'architecture tour'
  ]
} as const

// Temperature comfort ranges (Celsius)
export const TEMPERATURE_COMFORT = {
  VERY_COLD: { min: -20, max: 0, label: 'Very Cold', comfort: 20 },
  COLD: { min: 0, max: 10, label: 'Cold', comfort: 40 },
  COOL: { min: 10, max: 18, label: 'Cool', comfort: 70 },
  COMFORTABLE: { min: 18, max: 25, label: 'Comfortable', comfort: 100 },
  WARM: { min: 25, max: 30, label: 'Warm', comfort: 85 },
  HOT: { min: 30, max: 35, label: 'Hot', comfort: 60 },
  VERY_HOT: { min: 35, max: 50, label: 'Very Hot', comfort: 30 }
} as const

// Utility functions
export const kelvinToCelsius = (kelvin: number): number => {
  return Math.round(kelvin - 273.15)
}

export const celsiusToFahrenheit = (celsius: number): number => {
  return Math.round((celsius * 9/5) + 32)
}

export const mpsToKmh = (mps: number): number => {
  return Math.round(mps * 3.6)
}

export const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

export const getWeatherSeverity = (condition: string, temp: number, windSpeed: number, precipitation: number): 'mild' | 'moderate' | 'severe' => {
  const conditionLower = condition.toLowerCase()
  
  // Check for extreme conditions
  if (WEATHER_CATEGORIES.EXTREME.some(extreme => conditionLower.includes(extreme.toLowerCase()))) {
    return 'severe'
  }
  
  // Check for severe weather patterns
  if (WEATHER_CATEGORIES.THUNDERSTORM.some(storm => conditionLower.includes(storm.toLowerCase())) ||
      WEATHER_CATEGORIES.HEAVY_RAIN.some(rain => conditionLower.includes(rain.toLowerCase())) ||
      temp < -10 || temp > 40 || windSpeed > 50 || precipitation > 20) {
    return 'severe'
  }
  
  // Check for moderate conditions
  if (WEATHER_CATEGORIES.MODERATE_RAIN.some(rain => conditionLower.includes(rain.toLowerCase())) ||
      WEATHER_CATEGORIES.SNOW.some(snow => conditionLower.includes(snow.toLowerCase())) ||
      temp < 0 || temp > 35 || windSpeed > 25 || precipitation > 5) {
    return 'moderate'
  }
  
  return 'mild'
}

export const getTemperatureComfort = (temperature: number): { level: string; score: number } => {
  for (const [level, range] of Object.entries(TEMPERATURE_COMFORT)) {
    if (temperature >= range.min && temperature < range.max) {
      return { level: range.label, score: range.comfort }
    }
  }
  return { level: 'Extreme', score: 10 }
}

export const classifyActivityLocation = (activityName: string, activityType: string, description: string): 'outdoor' | 'indoor' | 'mixed' => {
  const text = `${activityName} ${activityType} ${description}`.toLowerCase()
  
  // Check for explicit outdoor keywords
  const outdoorScore = ACTIVITY_OUTDOOR_CLASSIFICATION.outdoor.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0)
  }, 0)
  
  // Check for explicit indoor keywords
  const indoorScore = ACTIVITY_OUTDOOR_CLASSIFICATION.indoor.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0)
  }, 0)
  
  // Check for mixed keywords
  const mixedScore = ACTIVITY_OUTDOOR_CLASSIFICATION.mixed.reduce((score, keyword) => {
    return score + (text.includes(keyword) ? 1 : 0)
  }, 0)
  
  if (outdoorScore > indoorScore && outdoorScore > mixedScore) return 'outdoor'
  if (indoorScore > outdoorScore && indoorScore > mixedScore) return 'indoor'
  if (mixedScore > 0) return 'mixed'
  
  // Default classification based on activity type
  switch (activityType) {
    case 'restaurant':
    case 'accommodation':
      return 'indoor'
    case 'attraction':
      return 'mixed'
    case 'transportation':
      return 'outdoor'
    case 'experience':
      return 'mixed'
    default:
      return 'mixed'
  }
}