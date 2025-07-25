import { 
  PackingList, 
  PackingItem, 
  ProcessedWeather, 
  WeatherForecast 
} from '@/lib/weather-types'
import { Activity, Day } from '@/lib/itinerary-types'

export class PackingListGenerator {
  
  // Generate complete packing list based on weather and itinerary
  public generatePackingList(
    destination: string,
    startDate: string,
    endDate: string,
    weatherForecast: WeatherForecast,
    itinerary?: Day[]
  ): PackingList {
    const items: PackingItem[] = []
    const generalTips: string[] = []
    
    // Analyze weather patterns
    const weatherAnalysis = this.analyzeWeatherPatterns(weatherForecast.forecast)
    
    // Generate clothing items
    items.push(...this.generateClothingItems(weatherAnalysis))
    
    // Generate accessories
    items.push(...this.generateAccessoryItems(weatherAnalysis))
    
    // Generate equipment based on weather
    items.push(...this.generateEquipmentItems(weatherAnalysis))
    
    // Generate personal care items
    items.push(...this.generatePersonalCareItems(weatherAnalysis))
    
    // Generate document suggestions
    items.push(...this.generateDocumentItems(weatherAnalysis))
    
    // Generate activity-specific items
    if (itinerary) {
      items.push(...this.generateActivitySpecificItems(itinerary, weatherAnalysis))
    }
    
    // Generate general tips
    generalTips.push(...this.generateGeneralTips(weatherAnalysis, destination))
    
    // Sort items by priority and category
    const sortedItems = this.sortAndDeduplicateItems(items)
    
    return {
      destination,
      travelDates: { start: startDate, end: endDate },
      weatherSummary: this.generateWeatherSummary(weatherAnalysis),
      items: sortedItems,
      generalTips,
      lastUpdated: new Date().toISOString()
    }
  }
  
  // Analyze weather patterns across the forecast
  private analyzeWeatherPatterns(forecast: ProcessedWeather[]) {
    const temps = forecast.map(day => day.temperature)
    const minTemp = Math.min(...temps.map(t => t.min))
    const maxTemp = Math.max(...temps.map(t => t.max))
    const avgTemp = temps.reduce((sum, t) => sum + t.current, 0) / temps.length
    
    const rainyDays = forecast.filter(day => day.precipitation.probability > 50).length
    const snowyDays = forecast.filter(day => day.precipitation.type === 'snow').length
    const windyDays = forecast.filter(day => day.wind.speed > 25).length
    const extremeDays = forecast.filter(day => day.isExtreme).length
    const coldDays = forecast.filter(day => day.temperature.max < 10).length
    const hotDays = forecast.filter(day => day.temperature.max > 30).length
    
    const totalPrecipitation = forecast.reduce((sum, day) => sum + day.precipitation.amount, 0)
    const maxWindSpeed = Math.max(...forecast.map(day => day.wind.speed))
    const avgHumidity = forecast.reduce((sum, day) => sum + day.humidity, 0) / forecast.length
    
    return {
      minTemp,
      maxTemp,
      avgTemp,
      rainyDays,
      snowyDays,
      windyDays,
      extremeDays,
      coldDays,
      hotDays,
      totalPrecipitation,
      maxWindSpeed,
      avgHumidity,
      tripDuration: forecast.length
    }
  }
  
  // Generate clothing items based on weather
  private generateClothingItems(analysis: any): PackingItem[] {
    const items: PackingItem[] = []
    
    // Base clothing essentials
    items.push({
      item: 'Underwear',
      category: 'clothing',
      priority: 'essential',
      reason: 'Daily essentials',
      quantity: analysis.tripDuration + 2
    })
    
    items.push({
      item: 'Socks',
      category: 'clothing',
      priority: 'essential',
      reason: 'Daily essentials',
      quantity: analysis.tripDuration + 2
    })
    
    // Temperature-based clothing
    if (analysis.minTemp < 0) {
      items.push({
        item: 'Heavy winter coat',
        category: 'clothing',
        priority: 'essential',
        reason: `Temperatures as low as ${Math.round(analysis.minTemp)}°C expected`,
        quantity: 1
      })
      
      items.push({
        item: 'Thermal underwear',
        category: 'clothing',
        priority: 'essential',
        reason: 'Essential for sub-zero temperatures',
        quantity: 2
      })
      
      items.push({
        item: 'Wool sweaters',
        category: 'clothing',
        priority: 'essential',
        reason: 'Insulation for cold weather',
        quantity: 2
      })
    } else if (analysis.minTemp < 10) {
      items.push({
        item: 'Warm jacket',
        category: 'clothing',
        priority: 'essential',
        reason: `Cold temperatures (${Math.round(analysis.minTemp)}°C) expected`,
        quantity: 1
      })
      
      items.push({
        item: 'Sweaters/hoodies',
        category: 'clothing',
        priority: 'recommended',
        reason: 'Layering for cool weather',
        quantity: 2
      })
    }
    
    if (analysis.maxTemp > 30) {
      items.push({
        item: 'Light, breathable shirts',
        category: 'clothing',
        priority: 'essential',
        reason: `Hot temperatures (up to ${Math.round(analysis.maxTemp)}°C) expected`,
        quantity: Math.min(analysis.tripDuration, 5)
      })
      
      items.push({
        item: 'Shorts',
        category: 'clothing',
        priority: 'essential',
        reason: 'Essential for hot weather comfort',
        quantity: 3
      })
      
      items.push({
        item: 'Sun hat',
        category: 'clothing',
        priority: 'recommended',
        reason: 'Protection from intense sun',
        quantity: 1
      })
    } else if (analysis.maxTemp > 20) {
      items.push({
        item: 'T-shirts',
        category: 'clothing',
        priority: 'essential',
        reason: 'Comfortable for mild to warm weather',
        quantity: Math.min(analysis.tripDuration, 4)
      })
      
      items.push({
        item: 'Light pants/jeans',
        category: 'clothing',
        priority: 'recommended',
        reason: 'Versatile for varying temperatures',
        quantity: 2
      })
    }
    
    // Rain protection
    if (analysis.rainyDays > 2) {
      items.push({
        item: 'Waterproof jacket',
        category: 'clothing',
        priority: 'essential',
        reason: `Rain expected on ${analysis.rainyDays} days`,
        quantity: 1
      })
      
      items.push({
        item: 'Quick-dry pants',
        category: 'clothing',
        priority: 'recommended',
        reason: 'Practical for wet weather',
        quantity: 1
      })
    }
    
    // Snow protection
    if (analysis.snowyDays > 0) {
      items.push({
        item: 'Waterproof snow boots',
        category: 'clothing',
        priority: 'essential',
        reason: 'Snow expected - proper footwear essential',
        quantity: 1
      })
      
      items.push({
        item: 'Warm, waterproof gloves',
        category: 'clothing',
        priority: 'essential',
        reason: 'Hand protection in snow',
        quantity: 1
      })
    }
    
    return items
  }
  
  // Generate accessory items
  private generateAccessoryItems(analysis: any): PackingItem[] {
    const items: PackingItem[] = []
    
    // Universal accessories
    items.push({
      item: 'Comfortable walking shoes',
      category: 'accessories',
      priority: 'essential',
      reason: 'Essential for travel comfort',
      quantity: 1
    })
    
    // Weather-specific accessories
    if (analysis.rainyDays > 1) {
      items.push({
        item: 'Compact umbrella',
        category: 'accessories',
        priority: 'essential',
        reason: `Rain expected on ${analysis.rainyDays} days`,
        quantity: 1
      })
    }
    
    if (analysis.maxTemp > 25) {
      items.push({
        item: 'Sunglasses',
        category: 'accessories',
        priority: 'essential',
        reason: 'UV protection for sunny weather',
        quantity: 1
      })
    }
    
    if (analysis.windyDays > 2) {
      items.push({
        item: 'Hair ties/headband',
        category: 'accessories',
        priority: 'recommended',
        reason: `Windy conditions expected on ${analysis.windyDays} days`,
        quantity: 1
      })
    }
    
    if (analysis.minTemp < 5) {
      items.push({
        item: 'Warm hat/beanie',
        category: 'accessories',
        priority: 'essential',
        reason: 'Head protection in cold weather',
        quantity: 1
      })
      
      items.push({
        item: 'Scarf',
        category: 'accessories',
        priority: 'recommended',
        reason: 'Neck protection and warmth',
        quantity: 1
      })
    }
    
    return items
  }
  
  // Generate equipment items based on weather
  private generateEquipmentItems(analysis: any): PackingItem[] {
    const items: PackingItem[] = []
    
    if (analysis.extremeDays > 0) {
      items.push({
        item: 'Emergency weather radio',
        category: 'equipment',
        priority: 'recommended',
        reason: 'Severe weather conditions expected',
        quantity: 1
      })
    }
    
    if (analysis.totalPrecipitation > 20) {
      items.push({
        item: 'Waterproof bags/packing cubes',
        category: 'equipment',
        priority: 'recommended',
        reason: 'Protect belongings from moisture',
        quantity: 2
      })
    }
    
    if (analysis.avgHumidity > 80) {
      items.push({
        item: 'Moisture-absorbing packets',
        category: 'equipment',
        priority: 'optional',
        reason: 'High humidity may cause dampness',
        quantity: 3
      })
    }
    
    if (analysis.hotDays > 3) {
      items.push({
        item: 'Portable fan',
        category: 'equipment',
        priority: 'optional',
        reason: 'Cooling aid for hot weather',
        quantity: 1
      })
    }
    
    return items
  }
  
  // Generate personal care items
  private generatePersonalCareItems(analysis: any): PackingItem[] {
    const items: PackingItem[] = []
    
    // Universal items
    items.push({
      item: 'Toothbrush and toothpaste',
      category: 'personal',
      priority: 'essential',
      reason: 'Daily hygiene essentials',
      quantity: 1
    })
    
    // Weather-specific personal care
    if (analysis.maxTemp > 25) {
      items.push({
        item: 'Sunscreen (SPF 30+)',
        category: 'personal',
        priority: 'essential',
        reason: 'UV protection for sunny weather',
        quantity: 1
      })
      
      items.push({
        item: 'After-sun lotion',
        category: 'personal',
        priority: 'recommended',
        reason: 'Skin care for sun exposure',
        quantity: 1
      })
    }
    
    if (analysis.minTemp < 5 || analysis.maxWindSpeed > 30) {
      items.push({
        item: 'Moisturizer/lip balm',
        category: 'personal',
        priority: 'recommended',
        reason: 'Skin protection from cold/wind',
        quantity: 1
      })
    }
    
    if (analysis.avgHumidity < 40) {
      items.push({
        item: 'Hydrating lotion',
        category: 'personal',
        priority: 'recommended',
        reason: 'Combat dry air conditions',
        quantity: 1
      })
    }
    
    if (analysis.hotDays > 2) {
      items.push({
        item: 'Antiperspirant/deodorant',
        category: 'personal',
        priority: 'essential',
        reason: 'Essential for hot weather comfort',
        quantity: 1
      })
    }
    
    return items
  }
  
  // Generate document items
  private generateDocumentItems(analysis: any): PackingItem[] {
    const items: PackingItem[] = []
    
    items.push({
      item: 'Weather app/forecast printouts',
      category: 'documents',
      priority: 'recommended',
      reason: 'Stay updated on changing conditions',
      quantity: 1
    })
    
    if (analysis.extremeDays > 0) {
      items.push({
        item: 'Emergency contact information',
        category: 'documents',
        priority: 'essential',
        reason: 'Safety preparation for severe weather',
        quantity: 1
      })
    }
    
    return items
  }
  
  // Generate activity-specific items
  private generateActivitySpecificItems(itinerary: Day[], analysis: any): PackingItem[] {
    const items: PackingItem[] = []
    
    // Analyze activities across all days
    const allActivities = itinerary.flatMap(day => day.activities)
    
    const hasOutdoorActivities = allActivities.some(activity => 
      activity.type === 'attraction' && 
      (activity.name.toLowerCase().includes('park') || 
       activity.name.toLowerCase().includes('garden') ||
       activity.name.toLowerCase().includes('beach'))
    )
    
    const hasWaterActivities = allActivities.some(activity =>
      activity.name.toLowerCase().includes('beach') ||
      activity.name.toLowerCase().includes('water') ||
      activity.name.toLowerCase().includes('swim')
    )
    
    const hasFormalEvents = allActivities.some(activity =>
      activity.name.toLowerCase().includes('theater') ||
      activity.name.toLowerCase().includes('concert') ||
      activity.name.toLowerCase().includes('fine dining')
    )
    
    if (hasOutdoorActivities && analysis.maxTemp > 25) {
      items.push({
        item: 'Insect repellent',
        category: 'personal',
        priority: 'recommended',
        reason: 'Outdoor activities in warm weather',
        quantity: 1
      })
    }
    
    if (hasWaterActivities) {
      items.push({
        item: 'Swimwear',
        category: 'clothing',
        priority: 'essential',
        reason: 'Water activities planned',
        quantity: 1
      })
      
      items.push({
        item: 'Beach towel',
        category: 'accessories',
        priority: 'recommended',
        reason: 'Water activities planned',
        quantity: 1
      })
    }
    
    if (hasFormalEvents) {
      items.push({
        item: 'Formal/dressy outfit',
        category: 'clothing',
        priority: 'recommended',
        reason: 'Formal events in itinerary',
        quantity: 1
      })
    }
    
    return items
  }
  
  // Generate general packing tips
  private generateGeneralTips(analysis: any, destination: string): string[] {
    const tips: string[] = []
    
    tips.push('Check weather updates 24-48 hours before departure for any changes')
    tips.push('Pack layers to adapt to temperature variations throughout the day')
    
    if (analysis.rainyDays > 2) {
      tips.push('Keep rain gear easily accessible in your day pack')
      tips.push('Pack extra plastic bags to protect electronics from moisture')
    }
    
    if (analysis.maxTemp - analysis.minTemp > 15) {
      tips.push('Temperature variations expected - pack versatile pieces that can be layered')
    }
    
    if (analysis.extremeDays > 0) {
      tips.push('Monitor weather alerts and be prepared to modify outdoor plans')
      tips.push('Keep emergency supplies and important documents waterproof')
    }
    
    if (analysis.hotDays > 3) {
      tips.push('Stay hydrated and take breaks in air-conditioned spaces')
      tips.push('Plan outdoor activities for early morning or evening when possible')
    }
    
    if (analysis.coldDays > 3) {
      tips.push('Dress in layers and cover exposed skin in cold weather')
      tips.push('Keep extremities warm with proper gloves, hats, and socks')
    }
    
    tips.push('Leave space in your luggage for purchases and souvenirs')
    
    return tips.slice(0, 6) // Limit to 6 tips
  }
  
  // Generate weather summary text
  private generateWeatherSummary(analysis: any): string {
    const tempRange = `${Math.round(analysis.minTemp)}°C to ${Math.round(analysis.maxTemp)}°C`
    let summary = `Expect temperatures ranging from ${tempRange}`
    
    if (analysis.rainyDays > 0) {
      summary += `, with rain expected on ${analysis.rainyDays} day${analysis.rainyDays > 1 ? 's' : ''}`
    }
    
    if (analysis.snowyDays > 0) {
      summary += `, including ${analysis.snowyDays} day${analysis.snowyDays > 1 ? 's' : ''} with snow`
    }
    
    if (analysis.extremeDays > 0) {
      summary += `. ${analysis.extremeDays} day${analysis.extremeDays > 1 ? 's' : ''} may have severe weather conditions`
    }
    
    return summary + '.'
  }
  
  // Sort and remove duplicates from packing items
  private sortAndDeduplicateItems(items: PackingItem[]): PackingItem[] {
    // Remove duplicates based on item name
    const uniqueItems = items.reduce((acc, current) => {
      const existing = acc.find(item => item.item === current.item)
      if (!existing) {
        acc.push(current)
      } else if (current.priority === 'essential' && existing.priority !== 'essential') {
        // Upgrade priority if a duplicate has higher priority
        const index = acc.indexOf(existing)
        acc[index] = current
      }
      return acc
    }, [] as PackingItem[])
    
    // Sort by priority, then by category
    const priorityOrder = { essential: 0, recommended: 1, optional: 2 }
    const categoryOrder = { clothing: 0, accessories: 1, personal: 2, equipment: 3, documents: 4 }
    
    return uniqueItems.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category]
      if (categoryDiff !== 0) return categoryDiff
      
      return a.item.localeCompare(b.item)
    })
  }
}

// Export singleton instance
export const packingListGenerator = new PackingListGenerator()