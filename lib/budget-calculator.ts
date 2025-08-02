import { TripPlanningFormData } from './trip-validation'
import { ItineraryResponse, Activity } from './itinerary-validation'

// Budget category definitions
export interface BudgetBreakdown {
  accommodation: number
  food: number
  activities: number
  transportation: number
  other: number
}

export interface BudgetEstimate {
  total: number
  currency: string
  breakdown: BudgetBreakdown
  dailyAverage: number
  perPersonTotal?: number
}

// Regional cost multipliers based on destination
export const regionalMultipliers: Record<string, number> = {
  // Europe - High cost
  'western-europe': 1.4,
  'northern-europe': 1.5,
  'southern-europe': 1.2,
  
  // Asia - Variable cost
  'east-asia': 1.1,
  'southeast-asia': 0.7,
  'south-asia': 0.5,
  'central-asia': 0.6,
  
  // Americas
  'north-america': 1.3,
  'central-america': 0.8,
  'south-america': 0.9,
  
  // Africa
  'north-africa': 0.7,
  'sub-saharan-africa': 0.6,
  
  // Oceania
  'australia-new-zealand': 1.4,
  'pacific-islands': 1.6,
  
  // Middle East
  'middle-east': 1.0,
  
  // Default
  'default': 1.0
}

// Base daily costs by accommodation type (in USD)
export const baseDailyCosts = {
  budget: {
    accommodation: 25,
    food: 20,
    activities: 15,
    transportation: 8,
    other: 7
  },
  'mid-range': {
    accommodation: 80,
    food: 40,
    activities: 30,
    transportation: 15,
    other: 15
  },
  luxury: {
    accommodation: 200,
    food: 80,
    activities: 60,
    transportation: 30,
    other: 30
  }
}

// Currency conversion rates (simplified - in production use real-time API)
export const currencyRates: Record<string, number> = {
  'USD': 1.0,
  'EUR': 0.85,
  'GBP': 0.73,
  'JPY': 110.0,
  'CAD': 1.25,
  'AUD': 1.35,
  'CHF': 0.92,
  'CNY': 6.45,
  'INR': 74.0,
  'BRL': 5.2,
  'MXN': 20.0,
  'SGD': 1.35,
  'HKD': 7.8,
  'NOK': 8.6,
  'SEK': 8.8,
  'DKK': 6.3,
  'PLN': 3.9,
  'CZK': 21.5,
  'HUF': 295.0,
  'RUB': 73.0,
  'TRY': 8.5,
  'ZAR': 14.2,
  'KRW': 1180.0,
  'THB': 31.0,
  'VND': 23000.0,
  'PHP': 50.0,
  'IDR': 14300.0,
  'MYR': 4.1,
  'AED': 3.67,
  'SAR': 3.75,
  'EGP': 15.7,
  'MAD': 8.9,
  'TND': 2.8,
  'KES': 108.0,
  'NGN': 411.0,
  'GHS': 5.8,
  'UGX': 3540.0,
  'TZS': 2310.0,
  'RWF': 1000.0,
  'ETB': 44.0,
  'XOF': 558.0, // West African CFA franc
  'XAF': 558.0, // Central African CFA franc
  'LKR': 200.0,
  'PKR': 170.0,
  'BDT': 85.0,
  'NPR': 118.0,
  'MMK': 1400.0,
  'LAK': 9500.0,
  'KHR': 4080.0,
  'BND': 1.35,
  'TWD': 28.0,
  'MOP': 8.0,
  'FJD': 2.1,
  'TOP': 2.3,
  'WST': 2.6,
  'VUV': 112.0,
  'SBD': 8.0,
  'PGK': 3.5,
  'NCF': 107.0,
  'XPF': 107.0 // CFP franc
}

export class BudgetCalculator {
  
  // Calculate budget estimate based on form data
  calculateEstimate(formData: TripPlanningFormData): BudgetEstimate {
    const duration = this.getTripDuration(formData.dateRange.startDate, formData.dateRange.endDate)
    const travelers = formData.travelers.adults + formData.travelers.children + formData.travelers.infants
    const region = this.getRegionFromDestination(formData.destination.destination)
    const multiplier = regionalMultipliers[region] || regionalMultipliers['default']
    
    // Get base costs for accommodation type
    const baseCosts = baseDailyCosts[formData.preferences.accommodationType]
    
    // Apply regional multiplier and traveler adjustments
    const adjustedCosts = {
      accommodation: this.calculateAccommodationCost(baseCosts.accommodation, travelers, multiplier),
      food: this.calculateFoodCost(baseCosts.food, travelers, multiplier, formData.preferences.dietaryRestrictions || []),
      activities: this.calculateActivityCost(baseCosts.activities, travelers, multiplier, formData.interests),
      transportation: this.calculateTransportationCost(baseCosts.transportation, travelers, multiplier, formData.preferences.transportation),
      other: this.calculateOtherCost(baseCosts.other, travelers, multiplier)
    }
    
    // Calculate daily total
    const dailyTotal = Object.values(adjustedCosts).reduce((sum, cost) => sum + cost, 0)
    const tripTotal = dailyTotal * duration
    
    // Convert to user's currency
    const convertedTotal = this.convertCurrency(tripTotal, 'USD', formData.budget.currency)
    const convertedBreakdown = {
      accommodation: this.convertCurrency(adjustedCosts.accommodation * duration, 'USD', formData.budget.currency),
      food: this.convertCurrency(adjustedCosts.food * duration, 'USD', formData.budget.currency),
      activities: this.convertCurrency(adjustedCosts.activities * duration, 'USD', formData.budget.currency),
      transportation: this.convertCurrency(adjustedCosts.transportation * duration, 'USD', formData.budget.currency),
      other: this.convertCurrency(adjustedCosts.other * duration, 'USD', formData.budget.currency)
    }
    
    return {
      total: Math.round(convertedTotal),
      currency: formData.budget.currency,
      breakdown: {
        accommodation: Math.round(convertedBreakdown.accommodation),
        food: Math.round(convertedBreakdown.food),
        activities: Math.round(convertedBreakdown.activities),
        transportation: Math.round(convertedBreakdown.transportation),
        other: Math.round(convertedBreakdown.other)
      },
      dailyAverage: Math.round(convertedTotal / duration),
      perPersonTotal: travelers > 1 ? Math.round(convertedTotal / travelers) : undefined
    }
  }

  // Validate user budget against estimate
  validateBudget(formData: TripPlanningFormData): {
    isRealistic: boolean
    estimate: BudgetEstimate
    userBudget: number
    difference: number
    differencePercentage: number
    recommendations: string[]
  } {
    const estimate = this.calculateEstimate(formData)
    const userBudget = formData.budget.amount
    const difference = userBudget - estimate.total
    const differencePercentage = (difference / estimate.total) * 100
    
    const recommendations: string[] = []
    
    // Budget analysis
    const isRealistic = Math.abs(differencePercentage) <= 30 // Within 30% is considered realistic
    
    if (differencePercentage < -50) {
      recommendations.push('Your budget may be too low for this destination and accommodation type')
      recommendations.push('Consider choosing budget accommodation or reducing trip duration')
      recommendations.push('Look for free activities and local street food options')
    } else if (differencePercentage < -20) {
      recommendations.push('Your budget is below our estimate - consider more budget-friendly options')
      recommendations.push('Focus on free walking tours and local markets')
    } else if (differencePercentage > 50) {
      recommendations.push('You have a generous budget! Consider upgrading accommodation or adding experiences')
      recommendations.push('Look into premium activities and fine dining options')
    } else if (differencePercentage > 20) {
      recommendations.push('Your budget allows for some flexibility and spontaneous activities')
    }
    
    return {
      isRealistic,
      estimate,
      userBudget,
      difference: Math.round(difference),
      differencePercentage: Math.round(differencePercentage),
      recommendations
    }
  }

  // Optimize itinerary based on budget constraints
  optimizeItineraryBudget(itinerary: ItineraryResponse, targetBudget: number): {
    optimizedItinerary: ItineraryResponse
    savings: number
    modifications: string[]
  } {
    const modifications: string[] = []
    const optimizedItinerary = JSON.parse(JSON.stringify(itinerary)) // Deep clone
    
    const currentTotal = itinerary.itinerary.totalBudgetEstimate.amount
    const targetSavings = currentTotal - targetBudget
    
    if (targetSavings <= 0) {
      return {
        optimizedItinerary: itinerary,
        savings: 0,
        modifications: ['Budget is already within target']
      }
    }
    
    let totalSaved = 0
    
    // 1. Optimize accommodation (40% of potential savings)
    const accommodationSavings = Math.min(
      targetSavings * 0.4,
      optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.accommodation * 0.3
    )
    optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.accommodation -= accommodationSavings
    totalSaved += accommodationSavings
    if (accommodationSavings > 0) {
      modifications.push(`Reduced accommodation budget by ${Math.round(accommodationSavings)} ${itinerary.itinerary.totalBudgetEstimate.currency}`)
    }
    
    // 2. Optimize food costs (30% of potential savings)
    const foodSavings = Math.min(
      (targetSavings - totalSaved) * 0.3,
      optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.food * 0.25
    )
    optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.food -= foodSavings
    totalSaved += foodSavings
    if (foodSavings > 0) {
      modifications.push(`Reduced food budget by focusing on local eateries and markets`)
    }
    
    // 3. Optimize activity costs (20% of potential savings)
    const activitySavings = Math.min(
      (targetSavings - totalSaved) * 0.2,
      optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.activities * 0.4
    )
    optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.activities -= activitySavings
    totalSaved += activitySavings
    
    // Reduce individual activity costs
    optimizedItinerary.itinerary.days.forEach(day => {
      day.activities.forEach(activity => {
        if (activity.pricing.amount > 0) {
          const reduction = Math.min(activity.pricing.amount * 0.2, activitySavings / optimizedItinerary.itinerary.days.length)
          activity.pricing.amount = Math.max(0, activity.pricing.amount - reduction)
        }
      })
    })
    
    if (activitySavings > 0) {
      modifications.push(`Found more budget-friendly activity alternatives`)
    }
    
    // 4. Optimize transportation (10% of potential savings)
    const transportationSavings = Math.min(
      (targetSavings - totalSaved) * 0.1,
      optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.transportation * 0.3
    )
    optimizedItinerary.itinerary.totalBudgetEstimate.breakdown.transportation -= transportationSavings
    totalSaved += transportationSavings
    if (transportationSavings > 0) {
      modifications.push(`Optimized transportation by using more public transport and walking`)
    }
    
    // Update total budget
    optimizedItinerary.itinerary.totalBudgetEstimate.amount = currentTotal - totalSaved
    
    // Update daily budgets proportionally
    optimizedItinerary.itinerary.days.forEach(day => {
      const reductionFactor = (currentTotal - totalSaved) / currentTotal
      day.dailyBudget.amount = Math.round(day.dailyBudget.amount * reductionFactor)
    })
    
    return {
      optimizedItinerary,
      savings: Math.round(totalSaved),
      modifications
    }
  }

  // Calculate accommodation cost
  private calculateAccommodationCost(baseCost: number, travelers: number, multiplier: number): number {
    // Accommodation cost doesn't scale linearly with travelers (shared rooms)
    const travelerMultiplier = travelers === 1 ? 1 : 1 + (travelers - 1) * 0.6
    return baseCost * multiplier * travelerMultiplier
  }

  // Calculate food cost
  private calculateFoodCost(baseCost: number, travelers: number, multiplier: number, dietaryRestrictions: string[]): number {
    let cost = baseCost * multiplier * travelers
    
    // Dietary restrictions can increase costs
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      const restrictionMultiplier = 1 + (dietaryRestrictions.length * 0.1)
      cost *= restrictionMultiplier
    }
    
    return cost
  }

  // Calculate activity cost
  private calculateActivityCost(baseCost: number, travelers: number, multiplier: number, interests: string[]): number {
    let cost = baseCost * multiplier * travelers
    
    // Some interests are more expensive
    const expensiveInterests = ['luxury', 'adventure', 'business']
    const hasExpensiveInterests = interests.some(interest => expensiveInterests.includes(interest))
    
    if (hasExpensiveInterests) {
      cost *= 1.3
    }
    
    return cost
  }

  // Calculate transportation cost
  private calculateTransportationCost(baseCost: number, travelers: number, multiplier: number, transportationType: string): number {
    let cost = baseCost * multiplier
    
    // Transportation type adjustments
    const transportMultipliers = {
      'walking': 0.3,
      'public': 1.0,
      'rental-car': 1.5,
      'mixed': 1.2
    }
    
    cost *= transportMultipliers[transportationType as keyof typeof transportMultipliers] || 1.0
    
    // Transportation often has group discounts
    const travelerMultiplier = travelers === 1 ? 1 : 1 + (travelers - 1) * 0.7
    return cost * travelerMultiplier
  }

  // Calculate other expenses
  private calculateOtherCost(baseCost: number, travelers: number, multiplier: number): number {
    return baseCost * multiplier * travelers
  }

  // Get trip duration in days
  private getTripDuration(startDate: Date, endDate: Date): number {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Determine region from destination (simplified)
  private getRegionFromDestination(destination: string): string {
    const destinationLower = destination.toLowerCase()
    
    // Europe
    if (destinationLower.includes('france') || destinationLower.includes('germany') || 
        destinationLower.includes('netherlands') || destinationLower.includes('belgium') ||
        destinationLower.includes('austria') || destinationLower.includes('switzerland')) {
      return 'western-europe'
    }
    
    if (destinationLower.includes('norway') || destinationLower.includes('sweden') || 
        destinationLower.includes('denmark') || destinationLower.includes('finland') ||
        destinationLower.includes('iceland')) {
      return 'northern-europe'
    }
    
    if (destinationLower.includes('spain') || destinationLower.includes('italy') || 
        destinationLower.includes('greece') || destinationLower.includes('portugal') ||
        destinationLower.includes('malta') || destinationLower.includes('cyprus')) {
      return 'southern-europe'
    }
    
    // Asia
    if (destinationLower.includes('japan') || destinationLower.includes('south korea') || 
        destinationLower.includes('china') || destinationLower.includes('taiwan') ||
        destinationLower.includes('hong kong') || destinationLower.includes('macau')) {
      return 'east-asia'
    }
    
    if (destinationLower.includes('thailand') || destinationLower.includes('vietnam') || 
        destinationLower.includes('cambodia') || destinationLower.includes('laos') ||
        destinationLower.includes('myanmar') || destinationLower.includes('malaysia') ||
        destinationLower.includes('singapore') || destinationLower.includes('indonesia') ||
        destinationLower.includes('philippines') || destinationLower.includes('brunei')) {
      return 'southeast-asia'
    }
    
    if (destinationLower.includes('india') || destinationLower.includes('pakistan') || 
        destinationLower.includes('bangladesh') || destinationLower.includes('sri lanka') ||
        destinationLower.includes('nepal') || destinationLower.includes('bhutan') ||
        destinationLower.includes('maldives')) {
      return 'south-asia'
    }
    
    // Americas
    if (destinationLower.includes('united states') || destinationLower.includes('canada') ||
        destinationLower.includes('usa') || destinationLower.includes('america')) {
      return 'north-america'
    }
    
    if (destinationLower.includes('mexico') || destinationLower.includes('guatemala') || 
        destinationLower.includes('belize') || destinationLower.includes('honduras') ||
        destinationLower.includes('el salvador') || destinationLower.includes('nicaragua') ||
        destinationLower.includes('costa rica') || destinationLower.includes('panama')) {
      return 'central-america'
    }
    
    // Oceania
    if (destinationLower.includes('australia') || destinationLower.includes('new zealand')) {
      return 'australia-new-zealand'
    }
    
    if (destinationLower.includes('fiji') || destinationLower.includes('samoa') || 
        destinationLower.includes('tonga') || destinationLower.includes('vanuatu')) {
      return 'pacific-islands'
    }
    
    return 'default'
  }

  // Convert currency (simplified - use real API in production)
  private convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount
    
    const fromRate = currencyRates[fromCurrency] || 1
    const toRate = currencyRates[toCurrency] || 1
    
    return (amount / fromRate) * toRate
  }

  // Get currency formatting info
  getCurrencyInfo(currency: string): {
    symbol: string
    decimals: number
    symbolPosition: 'before' | 'after'
  } {
    const currencyInfo: Record<string, { symbol: string; decimals: number; symbolPosition: 'before' | 'after' }> = {
      'USD': { symbol: '$', decimals: 2, symbolPosition: 'before' },
      'EUR': { symbol: '€', decimals: 2, symbolPosition: 'after' },
      'GBP': { symbol: '£', decimals: 2, symbolPosition: 'before' },
      'JPY': { symbol: '¥', decimals: 0, symbolPosition: 'before' },
      'CAD': { symbol: 'C$', decimals: 2, symbolPosition: 'before' },
      'AUD': { symbol: 'A$', decimals: 2, symbolPosition: 'before' },
      'CHF': { symbol: 'Fr', decimals: 2, symbolPosition: 'after' },
      'CNY': { symbol: '¥', decimals: 2, symbolPosition: 'before' },
      'INR': { symbol: '₹', decimals: 2, symbolPosition: 'before' },
      'BRL': { symbol: 'R$', decimals: 2, symbolPosition: 'before' },
      'MXN': { symbol: '$', decimals: 2, symbolPosition: 'before' },
      'SGD': { symbol: 'S$', decimals: 2, symbolPosition: 'before' },
      'HKD': { symbol: 'HK$', decimals: 2, symbolPosition: 'before' },
    }
    
    return currencyInfo[currency] || { symbol: currency, decimals: 2, symbolPosition: 'after' }
  }

  // Format currency amount
  formatCurrency(amount: number, currency: string): string {
    const info = this.getCurrencyInfo(currency)
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals
    })
    
    return info.symbolPosition === 'before' 
      ? `${info.symbol}${formatted}`
      : `${formatted} ${info.symbol}`
  }

  // Calculate budget per category for itinerary generation
  calculateCategoryBudgets(totalBudget: number, accommodationType: string): BudgetBreakdown {
    const percentages = {
      budget: { accommodation: 0.35, food: 0.35, activities: 0.20, transportation: 0.08, other: 0.02 },
      'mid-range': { accommodation: 0.40, food: 0.30, activities: 0.20, transportation: 0.08, other: 0.02 },
      luxury: { accommodation: 0.45, food: 0.25, activities: 0.20, transportation: 0.08, other: 0.02 }
    }
    
    const categoryPercentages = percentages[accommodationType as keyof typeof percentages] || percentages['mid-range']
    
    return {
      accommodation: Math.round(totalBudget * categoryPercentages.accommodation),
      food: Math.round(totalBudget * categoryPercentages.food),
      activities: Math.round(totalBudget * categoryPercentages.activities),
      transportation: Math.round(totalBudget * categoryPercentages.transportation),
      other: Math.round(totalBudget * categoryPercentages.other)
    }
  }
}

// Export singleton instance
export const budgetCalculator = new BudgetCalculator()

// Utility functions
export function formatBudgetBreakdown(breakdown: BudgetBreakdown, currency: string): string {
  const { formatCurrency } = budgetCalculator
  return [
    `Accommodation: ${formatCurrency(breakdown.accommodation, currency)}`,
    `Food: ${formatCurrency(breakdown.food, currency)}`,
    `Activities: ${formatCurrency(breakdown.activities, currency)}`,
    `Transportation: ${formatCurrency(breakdown.transportation, currency)}`,
    `Other: ${formatCurrency(breakdown.other, currency)}`
  ].join('\n')
}

export function calculateBudgetPerPerson(totalBudget: number, travelers: number): number {
  return Math.round(totalBudget / Math.max(1, travelers))
}

export function calculateDailyBudget(totalBudget: number, duration: number): number {
  return Math.round(totalBudget / Math.max(1, duration))
}