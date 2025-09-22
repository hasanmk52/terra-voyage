import { 
  WeatherForecast, 
  ProcessedWeather, 
  PackingItem, 
  ActivitySuitability,
  WeatherAlert,
  classifyActivityLocation,
  getTemperatureComfort 
} from './weather-types';

// Clothing recommendation categories
export interface ClothingRecommendation {
  category: 'base_layer' | 'outer_layer' | 'footwear' | 'accessories' | 'protection';
  items: string[];
  priority: 'essential' | 'recommended' | 'optional';
  reason: string;
}

// Activity impact assessment
export interface ActivityImpact {
  activityName: string;
  activityType: string;
  location: 'outdoor' | 'indoor' | 'mixed';
  suitabilityScore: number; // 0-100
  impact: 'positive' | 'neutral' | 'negative';
  recommendations: string[];
  alternatives?: string[];
}

// Weather-based recommendations service
export class WeatherRecommendationEngine {
  
  // Main recommendation function
  generateRecommendations(
    forecast: WeatherForecast,
    activities?: Array<{ name: string; type: string; description: string; time?: string }>
  ) {
    const current = forecast.current;
    const upcoming = forecast.forecast.slice(0, 3); // Next 3 days
    
    return {
      clothing: this.generateClothingRecommendations(current, upcoming),
      activities: activities ? this.assessActivitySuitability(activities, upcoming) : [],
      packing: this.generatePackingRecommendations(upcoming),
      alerts: this.generateWeatherAlerts(current, upcoming),
      dailyTips: this.generateDailyTips(upcoming)
    };
  }

  // Clothing recommendations based on weather
  private generateClothingRecommendations(
    current: ProcessedWeather, 
    forecast: ProcessedWeather[]
  ): ClothingRecommendation[] {
    const recommendations: ClothingRecommendation[] = [];
    const tempRange = this.getTempRange([current, ...forecast]);
    const maxPrecip = Math.max(current.precipitation.amount, ...forecast.map(d => d.precipitation.amount));
    const maxWind = Math.max(current.wind.speed, ...forecast.map(d => d.wind.speed));
    
    // Base layer recommendations
    if (tempRange.min < 10) {
      recommendations.push({
        category: 'base_layer',
        items: ['thermal underwear', 'long-sleeve base layer', 'warm socks'],
        priority: tempRange.min < 0 ? 'essential' : 'recommended',
        reason: `Cold temperatures expected (${tempRange.min}°C min)`
      });
    } else if (tempRange.max > 25) {
      recommendations.push({
        category: 'base_layer',
        items: ['moisture-wicking t-shirts', 'breathable underwear', 'light socks'],
        priority: 'recommended',
        reason: `Warm temperatures expected (${tempRange.max}°C max)`
      });
    }
    
    // Outer layer recommendations
    if (maxPrecip > 5 || forecast.some(d => d.precipitation.probability > 70)) {
      recommendations.push({
        category: 'outer_layer',
        items: ['waterproof jacket', 'rain pants', 'quick-dry clothes'],
        priority: 'essential',
        reason: `High chance of rain (${Math.max(...forecast.map(d => d.precipitation.probability))}% probability)`
      });
    } else if (maxWind > 25) {
      recommendations.push({
        category: 'outer_layer',
        items: ['windbreaker', 'fleece jacket'],
        priority: 'recommended',
        reason: `Windy conditions expected (${maxWind} km/h)`
      });
    }
    
    if (tempRange.min < 5) {
      recommendations.push({
        category: 'outer_layer',
        items: ['warm coat', 'insulated jacket', 'layers for warmth'],
        priority: tempRange.min < -5 ? 'essential' : 'recommended',
        reason: `Cold weather protection needed (${tempRange.min}°C min)`
      });
    }
    
    // Footwear recommendations
    if (maxPrecip > 2) {
      recommendations.push({
        category: 'footwear',
        items: ['waterproof boots', 'non-slip shoes', 'extra socks'],
        priority: 'essential',
        reason: 'Wet conditions expected'
      });
    } else if (tempRange.min < 0) {
      recommendations.push({
        category: 'footwear',
        items: ['insulated boots', 'warm socks', 'ice grips'],
        priority: 'essential',
        reason: 'Freezing temperatures and potential ice'
      });
    } else {
      recommendations.push({
        category: 'footwear',
        items: ['comfortable walking shoes', 'breathable socks'],
        priority: 'recommended',
        reason: 'General travel comfort'
      });
    }
    
    // Accessories
    const accessories: string[] = [];
    if (tempRange.min < 10) {
      accessories.push('warm hat', 'gloves', 'scarf');
    }
    if (tempRange.max > 25 || forecast.some(d => d.condition.main === 'Clear')) {
      accessories.push('sunglasses', 'sun hat', 'sunscreen');
    }
    if (maxPrecip > 1) {
      accessories.push('umbrella');
    }
    
    if (accessories.length > 0) {
      recommendations.push({
        category: 'accessories',
        items: accessories,
        priority: 'recommended',
        reason: 'Weather-appropriate accessories'
      });
    }
    
    // Protection items
    const protection: string[] = [];
    if (forecast.some(d => d.isExtreme)) {
      protection.push('emergency supplies', 'first aid kit');
    }
    if (maxWind > 40) {
      protection.push('secure bag straps', 'wind-resistant umbrella');
    }
    
    if (protection.length > 0) {
      recommendations.push({
        category: 'protection',
        items: protection,
        priority: 'essential',
        reason: 'Extreme weather protection'
      });
    }
    
    return recommendations;
  }

  // Activity suitability assessment
  private assessActivitySuitability(
    activities: Array<{ name: string; type: string; description: string; time?: string }>,
    forecast: ProcessedWeather[]
  ): ActivityImpact[] {
    return activities.map(activity => {
      const location = classifyActivityLocation(activity.name, activity.type, activity.description);
      const relevantWeather = this.getRelevantWeather(forecast, activity.time);
      
      const suitability = this.calculateActivitySuitability(activity, location, relevantWeather);
      
      return {
        activityName: activity.name,
        activityType: activity.type,
        location,
        suitabilityScore: suitability.score,
        impact: suitability.impact,
        recommendations: suitability.recommendations,
        alternatives: suitability.alternatives
      };
    });
  }

  private calculateActivitySuitability(
    activity: { name: string; type: string; description: string },
    location: 'outdoor' | 'indoor' | 'mixed',
    weather: ProcessedWeather
  ): { score: number; impact: 'positive' | 'neutral' | 'negative'; recommendations: string[]; alternatives?: string[] } {
    let score = 70; // Base score
    const recommendations: string[] = [];
    const alternatives: string[] = [];
    
    // Temperature impact
    const tempComfort = getTemperatureComfort(weather.temperature.current);
    if (location === 'outdoor') {
      score += (tempComfort.score - 70); // Adjust based on temperature comfort
      
      if (weather.temperature.current < 0) {
        recommendations.push('Dress warmly, consider shorter duration');
        if (weather.temperature.current < -10) {
          score -= 30;
          alternatives.push('Indoor alternative recommended due to extreme cold');
        }
      } else if (weather.temperature.current > 35) {
        recommendations.push('Bring water, seek shade frequently, avoid midday hours');
        score -= 20;
      }
    }
    
    // Precipitation impact
    if (weather.precipitation.probability > 70 && location === 'outdoor') {
      score -= 25;
      recommendations.push('Bring rain gear, check covered areas');
      alternatives.push('Indoor activities or covered venues');
    } else if (weather.precipitation.probability > 30 && location === 'outdoor') {
      score -= 10;
      recommendations.push('Bring umbrella or light rain jacket');
    }
    
    // Wind impact
    if (weather.wind.speed > 30 && location === 'outdoor') {
      score -= 15;
      recommendations.push('Secure loose items, dress in layers');
    }
    
    // Visibility impact
    if (weather.visibility < 2 && location === 'outdoor') {
      score -= 20;
      recommendations.push('Exercise caution, consider rescheduling');
    }
    
    // Extreme weather impact
    if (weather.isExtreme) {
      if (location === 'outdoor') {
        score -= 40;
        recommendations.push('Consider postponing or finding indoor alternative');
        alternatives.push('Indoor venues strongly recommended');
      } else {
        recommendations.push('Plan for potential delays or transportation issues');
      }
    }
    
    // Activity-specific adjustments
    if (activity.type === 'restaurant' || activity.type === 'accommodation') {
      score = Math.max(score, 80); // Indoor activities less affected
    } else if (activity.name.toLowerCase().includes('beach') && weather.temperature.current < 20) {
      score -= 25;
      recommendations.push('Beach activities not ideal in current temperatures');
    } else if (activity.name.toLowerCase().includes('hiking') && weather.precipitation.amount > 10) {
      score -= 30;
      recommendations.push('Hiking trails may be slippery and dangerous');
    }
    
    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));
    
    // Determine impact
    let impact: 'positive' | 'neutral' | 'negative';
    if (score >= 80) impact = 'positive';
    else if (score >= 60) impact = 'neutral';
    else impact = 'negative';
    
    return { score, impact, recommendations, alternatives: alternatives.length > 0 ? alternatives : undefined };
  }

  // Packing recommendations
  private generatePackingRecommendations(forecast: ProcessedWeather[]): PackingItem[] {
    const items: PackingItem[] = [];
    const tempRange = this.getTempRange(forecast);
    const maxPrecip = Math.max(...forecast.map(d => d.precipitation.amount));
    const hasExtreme = forecast.some(d => d.isExtreme);
    
    // Essential clothing
    items.push({
      item: 'Layered clothing system',
      category: 'clothing',
      priority: 'essential',
      reason: `Temperature range ${tempRange.min}°C to ${tempRange.max}°C`,
      quantity: 1
    });
    
    if (tempRange.min < 10) {
      items.push({
        item: 'Warm jacket or coat',
        category: 'clothing',
        priority: 'essential',
        reason: `Cold temperatures expected (${tempRange.min}°C min)`,
        quantity: 1
      });
    }
    
    if (maxPrecip > 2) {
      items.push(
        {
          item: 'Waterproof rain jacket',
          category: 'clothing',
          priority: 'essential',
          reason: 'Rain expected during trip',
          quantity: 1
        },
        {
          item: 'Quick-dry clothing',
          category: 'clothing',
          priority: 'recommended',
          reason: 'Wet weather conditions',
          quantity: 2
        }
      );
    }
    
    // Accessories
    if (tempRange.max > 25) {
      items.push(
        {
          item: 'Sunglasses',
          category: 'accessories',
          priority: 'recommended',
          reason: 'Bright sunny weather expected',
          quantity: 1
        },
        {
          item: 'Sunscreen (SPF 30+)',
          category: 'personal',
          priority: 'essential',
          reason: 'UV protection needed',
          quantity: 1
        }
      );
    }
    
    if (maxPrecip > 1) {
      items.push({
        item: 'Compact umbrella',
        category: 'accessories',
        priority: 'recommended',
        reason: 'Possible rain during trip',
        quantity: 1,
        alternatives: ['Rain poncho', 'Waterproof hood']
      });
    }
    
    // Equipment
    if (hasExtreme) {
      items.push({
        item: 'Emergency weather alerts app',
        category: 'equipment',
        priority: 'essential',
        reason: 'Extreme weather conditions possible',
        quantity: 1
      });
    }
    
    items.push({
      item: 'Weather-appropriate footwear',
      category: 'clothing',
      priority: 'essential',
      reason: 'Comfort and safety in varying weather',
      quantity: 2,
      alternatives: ['Waterproof boots', 'Breathable sneakers', 'Hiking boots']
    });
    
    return items;
  }

  // Weather alerts generation
  private generateWeatherAlerts(current: ProcessedWeather, forecast: ProcessedWeather[]): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    const allWeather = [current, ...forecast];
    
    // Temperature alerts
    const extremeTemp = allWeather.find(w => w.temperature.current < -10 || w.temperature.current > 40);
    if (extremeTemp) {
      alerts.push({
        id: `temp-extreme-${extremeTemp.date}`,
        type: 'temperature',
        severity: 'severe',
        title: 'Extreme Temperature Alert',
        description: `${extremeTemp.temperature.current}°C expected on ${extremeTemp.date}`,
        startDate: extremeTemp.date,
        affectedDays: [extremeTemp.date],
        recommendations: [
          'Dress appropriately for extreme temperatures',
          'Limit outdoor exposure time',
          'Stay hydrated and seek climate-controlled environments'
        ],
        dismissed: false
      });
    }
    
    // Precipitation alerts
    const heavyRain = allWeather.find(w => w.precipitation.amount > 15 || w.precipitation.probability > 90);
    if (heavyRain) {
      alerts.push({
        id: `precip-heavy-${heavyRain.date}`,
        type: 'precipitation',
        severity: 'warning',
        title: 'Heavy Rain Expected',
        description: `${heavyRain.precipitation.amount}mm of rain expected with ${heavyRain.precipitation.probability}% probability`,
        startDate: heavyRain.date,
        affectedDays: [heavyRain.date],
        recommendations: [
          'Carry waterproof clothing and umbrella',
          'Allow extra travel time',
          'Consider indoor activities'
        ],
        dismissed: false
      });
    }
    
    // Wind alerts
    const strongWind = allWeather.find(w => w.wind.speed > 50);
    if (strongWind) {
      alerts.push({
        id: `wind-strong-${strongWind.date}`,
        type: 'wind',
        severity: 'warning',
        title: 'Strong Wind Warning',
        description: `Wind speeds up to ${strongWind.wind.speed} km/h expected`,
        startDate: strongWind.date,
        affectedDays: [strongWind.date],
        recommendations: [
          'Secure loose items',
          'Be cautious around trees and structures',
          'Consider indoor alternatives for outdoor activities'
        ],
        dismissed: false
      });
    }
    
    // Visibility alerts
    const poorVisibility = allWeather.find(w => w.visibility < 1);
    if (poorVisibility) {
      alerts.push({
        id: `visibility-poor-${poorVisibility.date}`,
        type: 'visibility',
        severity: 'warning',
        title: 'Poor Visibility Conditions',
        description: `Visibility reduced to ${poorVisibility.visibility}km due to ${poorVisibility.condition.description}`,
        startDate: poorVisibility.date,
        affectedDays: [poorVisibility.date],
        recommendations: [
          'Exercise extra caution when traveling',
          'Allow extra time for transportation',
          'Consider postponing outdoor activities'
        ],
        dismissed: false
      });
    }
    
    return alerts;
  }

  // Daily travel tips
  private generateDailyTips(forecast: ProcessedWeather[]): Array<{ date: string; tips: string[] }> {
    return forecast.map(day => ({
      date: day.date,
      tips: this.getDailyTips(day)
    }));
  }

  private getDailyTips(weather: ProcessedWeather): string[] {
    const tips: string[] = [];
    
    // Temperature tips
    if (weather.temperature.current < 5) {
      tips.push('Bundle up! Layer clothing and protect extremities from cold');
    } else if (weather.temperature.current > 30) {
      tips.push('Stay cool! Drink plenty of water and seek shade during peak hours');
    }
    
    // Precipitation tips
    if (weather.precipitation.probability > 60) {
      tips.push('Pack rain gear and plan indoor backup activities');
    } else if (weather.precipitation.probability > 30) {
      tips.push('Keep an umbrella handy, light rain possible');
    }
    
    // Wind tips
    if (weather.wind.speed > 25) {
      tips.push('Windy day ahead - secure loose items and dress in layers');
    }
    
    // General comfort tips
    const tempComfort = getTemperatureComfort(weather.temperature.current);
    if (tempComfort.score >= 90) {
      tips.push('Perfect weather for outdoor activities! Great day for sightseeing');
    } else if (tempComfort.score < 40) {
      tips.push('Weather may be challenging - consider indoor activities or shorter outdoor trips');
    }
    
    // Activity timing tips
    if (weather.condition.main === 'Clear' && weather.temperature.current > 20) {
      tips.push('Excellent conditions for photography and outdoor dining');
    }
    
    if (weather.humidity > 80) {
      tips.push('High humidity - choose breathable fabrics and stay hydrated');
    }
    
    return tips;
  }

  // Helper methods
  private getTempRange(weather: ProcessedWeather[]): { min: number; max: number } {
    const allTemps = weather.flatMap(w => [w.temperature.min, w.temperature.max, w.temperature.current]);
    return {
      min: Math.min(...allTemps),
      max: Math.max(...allTemps)
    };
  }

  private getRelevantWeather(forecast: ProcessedWeather[], time?: string): ProcessedWeather {
    if (!time) return forecast[0]; // Default to first day
    
    // Parse time and find relevant day
    // For simplicity, using first day for now
    // In a real implementation, you'd parse the time and match to the correct forecast day
    return forecast[0];
  }
}

// Export singleton instance
export const weatherRecommendationEngine = new WeatherRecommendationEngine();