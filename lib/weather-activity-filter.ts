import { Activity, Day } from '@/lib/itinerary-types'
import { 
  ProcessedWeather, 
  ActivitySuitability, 
  WeatherImpact,
  classifyActivityLocation,
  getTemperatureComfort
} from '@/lib/weather-types'

// Activity suitability scoring system
export class WeatherActivityFilter {
  
  // Main function to assess activity suitability based on weather
  public assessActivitySuitability(
    activity: Activity, 
    weather: ProcessedWeather
  ): ActivitySuitability {
    const locationClassification = classifyActivityLocation(
      activity.name, 
      activity.type, 
      activity.description
    )
    
    let score = 100 // Start with perfect score
    const reasons: string[] = []
    const alternatives: string[] = []
    
    // Temperature impact
    const tempComfort = getTemperatureComfort(weather.temperature.current)
    if (locationClassification === 'outdoor') {
      score = Math.min(score, tempComfort.score)
      if (tempComfort.score < 70) {
        reasons.push(`${tempComfort.level} temperature (${weather.temperature.current}°C) may be uncomfortable for outdoor activities`)
        if (weather.temperature.current < 10) {
          alternatives.push('Consider indoor alternatives or dress warmly')
        } else if (weather.temperature.current > 30) {
          alternatives.push('Consider indoor alternatives or activities during cooler hours')
        }
      }
    }
    
    // Precipitation impact
    if (weather.precipitation.probability > 0) {
      const precipitationImpact = this.assessPrecipitationImpact(
        locationClassification,
        weather.precipitation.probability,
        weather.precipitation.amount,
        weather.precipitation.type
      )
      
      score -= precipitationImpact.scoreReduction
      reasons.push(...precipitationImpact.reasons)
      alternatives.push(...precipitationImpact.alternatives)
    }
    
    // Wind impact
    if (weather.wind.speed > 20) {
      const windImpact = this.assessWindImpact(locationClassification, weather.wind.speed)
      score -= windImpact.scoreReduction
      reasons.push(...windImpact.reasons)
      alternatives.push(...windImpact.alternatives)
    }
    
    // Visibility impact
    if (weather.visibility < 5) {
      const visibilityImpact = this.assessVisibilityImpact(locationClassification, weather.visibility)
      score -= visibilityImpact.scoreReduction
      reasons.push(...visibilityImpact.reasons)
      alternatives.push(...visibilityImpact.alternatives)
    }
    
    // Extreme weather conditions
    if (weather.isExtreme) {
      if (locationClassification === 'outdoor') {
        score = Math.min(score, 20)
        reasons.push('Extreme weather conditions make outdoor activities dangerous')
        alternatives.push('Strongly recommend indoor alternatives')
      } else if (locationClassification === 'mixed') {
        score = Math.min(score, 60)
        reasons.push('Extreme weather may limit parts of this activity')
        alternatives.push('Focus on indoor portions of the activity')
      }
    }
    
    // Activity-specific adjustments
    score = this.applyActivitySpecificAdjustments(activity, weather, score, reasons, alternatives)
    
    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, Math.round(score)))
    
    return {
      activityId: activity.id,
      suitabilityScore: score,
      reasons: reasons.slice(0, 3), // Limit to top 3 reasons
      alternatives: alternatives.slice(0, 2), // Limit to top 2 alternatives
      weatherImpact: score >= 70 ? 'positive' : score >= 40 ? 'neutral' : 'negative'
    }
  }
  
  // Assess precipitation impact
  private assessPrecipitationImpact(
    locationClassification: 'outdoor' | 'indoor' | 'mixed',
    probability: number,
    amount: number,
    type: 'none' | 'rain' | 'snow' | 'mixed' | undefined
  ) {
    const result = {
      scoreReduction: 0,
      reasons: [] as string[],
      alternatives: [] as string[]
    }
    
    if (probability === 0) return result
    
    const intensityMultiplier = amount > 10 ? 1.5 : amount > 5 ? 1.2 : 1
    
    switch (locationClassification) {
      case 'outdoor':
        result.scoreReduction = (probability * 0.8) * intensityMultiplier
        if (probability > 70) {
          result.reasons.push(`High chance of ${type} (${probability}%) will significantly impact outdoor activities`)
          result.alternatives.push('Consider rescheduling or indoor alternatives')
        } else if (probability > 30) {
          result.reasons.push(`Moderate chance of ${type} (${probability}%) may affect outdoor activities`)
          result.alternatives.push('Bring weather protection or have backup plans')
        }
        break
        
      case 'mixed':
        result.scoreReduction = (probability * 0.4) * intensityMultiplier
        if (probability > 50) {
          result.reasons.push(`${type} likely (${probability}%) may limit outdoor portions`)
          result.alternatives.push('Focus on indoor aspects of the activity')
        }
        break
        
      case 'indoor':
        result.scoreReduction = probability * 0.1 // Minimal impact
        if (probability > 80 && amount > 20) {
          result.reasons.push('Heavy precipitation may affect transportation to venue')
        }
        break
    }
    
    return result
  }
  
  // Assess wind impact
  private assessWindImpact(locationClassification: 'outdoor' | 'indoor' | 'mixed', windSpeed: number) {
    const result = {
      scoreReduction: 0,
      reasons: [] as string[],
      alternatives: [] as string[]
    }
    
    if (locationClassification === 'indoor') return result
    
    if (windSpeed > 50) {
      result.scoreReduction = 40
      result.reasons.push(`Very strong winds (${windSpeed} km/h) make outdoor activities dangerous`)
      result.alternatives.push('Seek indoor alternatives for safety')
    } else if (windSpeed > 35) {
      result.scoreReduction = 25
      result.reasons.push(`Strong winds (${windSpeed} km/h) will make outdoor activities uncomfortable`)
      result.alternatives.push('Consider wind-protected locations')
    } else if (windSpeed > 20) {
      result.scoreReduction = 10
      result.reasons.push(`Moderate winds (${windSpeed} km/h) may affect outdoor comfort`)
    }
    
    return result
  }
  
  // Assess visibility impact
  private assessVisibilityImpact(locationClassification: 'outdoor' | 'indoor' | 'mixed', visibility: number) {
    const result = {
      scoreReduction: 0,
      reasons: [] as string[],
      alternatives: [] as string[]
    }
    
    if (locationClassification === 'indoor') return result
    
    if (visibility < 1) {
      result.scoreReduction = 50
      result.reasons.push(`Very poor visibility (${visibility}km) severely limits outdoor activities`)
      result.alternatives.push('Indoor activities recommended until visibility improves')
    } else if (visibility < 3) {
      result.scoreReduction = 30
      result.reasons.push(`Poor visibility (${visibility}km) may limit sightseeing and outdoor activities`)
      result.alternatives.push('Activities with closer focal points recommended')
    } else if (visibility < 5) {
      result.scoreReduction = 15
      result.reasons.push(`Reduced visibility (${visibility}km) may affect scenic activities`)
    }
    
    return result
  }
  
  // Apply activity-specific weather adjustments
  private applyActivitySpecificAdjustments(
    activity: Activity,
    weather: ProcessedWeather,
    currentScore: number,
    reasons: string[],
    alternatives: string[]
  ): number {
    let score = currentScore
    
    // Restaurant activities - less weather dependent
    if (activity.type === 'restaurant') {
      score = Math.max(score, 80) // Restaurants are generally weather-independent
      if (weather.precipitation.probability > 50) {
        reasons.push('Perfect weather for indoor dining')
      }
    }
    
    // Transportation activities - weather sensitive
    if (activity.type === 'transportation') {
      if (weather.precipitation.probability > 30 || weather.wind.speed > 25) {
        score *= 0.8
        reasons.push('Weather conditions may affect transportation comfort and safety')
        alternatives.push('Allow extra travel time and consider alternative routes')
      }
    }
    
    // Accommodation activities - weather independent
    if (activity.type === 'accommodation') {
      score = Math.max(score, 85)
    }
    
    // Attraction activities - varies by type
    if (activity.type === 'attraction') {
      const activityLower = activity.name.toLowerCase()
      
      // Museums, galleries - weather independent
      if (activityLower.includes('museum') || activityLower.includes('gallery') || 
          activityLower.includes('exhibition') || activityLower.includes('theater')) {
        score = Math.max(score, 85)
        if (weather.isExtreme) {
          reasons.push('Perfect indoor activity for severe weather')
        }
      }
      
      // Parks, gardens - weather dependent
      if (activityLower.includes('park') || activityLower.includes('garden') || 
          activityLower.includes('beach') || activityLower.includes('viewpoint')) {
        if (weather.condition.main.toLowerCase() === 'clear') {
          score = Math.min(score + 10, 100)
          reasons.push('Perfect weather for outdoor sightseeing')
        }
      }
      
      // Markets - partially weather dependent
      if (activityLower.includes('market')) {
        if (weather.precipitation.probability > 40) {
          score *= 0.9
          reasons.push('Rain may affect outdoor market areas')
        }
      }
    }
    
    // Experience activities - context dependent
    if (activity.type === 'experience') {
      const activityLower = activity.name.toLowerCase()
      
      // Outdoor experiences
      if (activityLower.includes('tour') && !activityLower.includes('indoor')) {
        if (weather.condition.main.toLowerCase() === 'clear' && 
            weather.temperature.current >= 18 && weather.temperature.current <= 28) {
          score = Math.min(score + 15, 100)
          reasons.push('Ideal weather for outdoor tours')
        }
      }
      
      // Photography experiences
      if (activityLower.includes('photo')) {
        if (weather.condition.main.toLowerCase() === 'clear') {
          score = Math.min(score + 10, 100)
          reasons.push('Excellent lighting conditions for photography')
        } else if (weather.precipitation.probability > 30) {
          score *= 0.7
          reasons.push('Overcast conditions may limit photography opportunities')
        }
      }
    }
    
    return score
  }
  
  // Generate weather impact for a full day
  public generateDayWeatherImpact(day: Day, weather: ProcessedWeather): WeatherImpact {
    const activities = day.activities.map(activity => 
      this.assessActivitySuitability(activity, weather)
    )
    
    const overallSuitability = activities.length > 0 
      ? Math.round(activities.reduce((sum, a) => sum + a.suitabilityScore, 0) / activities.length)
      : 100
    
    const recommendations = this.generateDayRecommendations(activities, weather)
    const alerts = this.generateWeatherAlerts(weather, activities)
    
    return {
      date: weather.date,
      overallSuitability,
      activities,
      recommendations,
      alerts
    }
  }
  
  // Generate recommendations for the day
  private generateDayRecommendations(
    activities: ActivitySuitability[], 
    weather: ProcessedWeather
  ): string[] {
    const recommendations: string[] = []
    
    const lowScoreActivities = activities.filter(a => a.suitabilityScore < 50)
    const highScoreActivities = activities.filter(a => a.suitabilityScore >= 80)
    
    if (weather.isExtreme) {
      recommendations.push('Extreme weather conditions - prioritize indoor activities and safety')
    }
    
    if (weather.precipitation.probability > 70) {
      recommendations.push('High chance of rain - bring waterproof clothing and umbrellas')
      recommendations.push('Consider indoor backup activities')
    }
    
    if (weather.temperature.current > 30) {
      recommendations.push('Hot weather - stay hydrated, seek shade, and plan activities during cooler hours')
    } else if (weather.temperature.current < 5) {
      recommendations.push('Cold weather - dress in warm layers and limit time outdoors')
    }
    
    if (weather.wind.speed > 30) {
      recommendations.push('Strong winds expected - secure loose items and avoid high places')
    }
    
    if (lowScoreActivities.length > 0) {
      recommendations.push(`Consider rescheduling or modifying ${lowScoreActivities.length} weather-sensitive activities`)
    }
    
    if (highScoreActivities.length > 0) {
      recommendations.push(`${highScoreActivities.length} activities are perfect for today's weather`)
    }
    
    return recommendations.slice(0, 4) // Limit to top 4 recommendations
  }
  
  // Generate weather alerts
  private generateWeatherAlerts(
    weather: ProcessedWeather, 
    activities: ActivitySuitability[]
  ): string[] {
    const alerts: string[] = []
    
    if (weather.isExtreme) {
      alerts.push('SEVERE WEATHER: Extreme conditions expected - exercise caution')
    }
    
    if (weather.precipitation.probability > 80 && weather.precipitation.amount > 15) {
      alerts.push('HEAVY RAIN: Significant rainfall expected - transportation may be affected')
    }
    
    if (weather.temperature.current > 35) {
      alerts.push('EXTREME HEAT: Very high temperatures - heat exhaustion risk')
    } else if (weather.temperature.current < -5) {
      alerts.push('EXTREME COLD: Very low temperatures - frostbite risk')
    }
    
    if (weather.wind.speed > 50) {
      alerts.push('HIGH WIND: Dangerous wind speeds - avoid exposed areas')
    }
    
    if (weather.visibility < 1) {
      alerts.push('POOR VISIBILITY: Heavy fog/haze - transportation delays possible')
    }
    
    const criticalActivities = activities.filter(a => a.suitabilityScore < 30).length
    if (criticalActivities > 0) {
      alerts.push(`${criticalActivities} planned activities are not recommended in current weather`)
    }
    
    return alerts
  }
  
  // Generate alternative activity suggestions
  public generateWeatherAlternatives(
    originalActivity: Activity,
    weather: ProcessedWeather,
    availableActivities?: Activity[]
  ): Activity[] {
    const alternatives: Activity[] = []
    
    if (!availableActivities) return alternatives
    
    const originalClassification = classifyActivityLocation(
      originalActivity.name,
      originalActivity.type,
      originalActivity.description
    )
    
    // If original is outdoor and weather is bad, suggest indoor alternatives
    if (originalClassification === 'outdoor' && 
        (weather.isExtreme || weather.precipitation.probability > 70)) {
      
      const indoorAlternatives = availableActivities.filter(activity => {
        const classification = classifyActivityLocation(
          activity.name,
          activity.type,
          activity.description
        )
        return classification === 'indoor' && 
               activity.type === originalActivity.type &&
               activity.id !== originalActivity.id
      })
      
      alternatives.push(...indoorAlternatives.slice(0, 3))
    }
    
    // If weather is perfect, suggest outdoor alternatives
    if (weather.condition.main.toLowerCase() === 'clear' && 
        weather.temperature.current >= 18 && weather.temperature.current <= 28) {
      
      const outdoorAlternatives = availableActivities.filter(activity => {
        const classification = classifyActivityLocation(
          activity.name,
          activity.type,
          activity.description
        )
        return classification === 'outdoor' && 
               activity.type === originalActivity.type &&
               activity.id !== originalActivity.id
      })
      
      alternatives.push(...outdoorAlternatives.slice(0, 2))
    }
    
    return alternatives
  }
}

// Export singleton instance
export const weatherActivityFilter = new WeatherActivityFilter()