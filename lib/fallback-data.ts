import { ItineraryResponse } from './itinerary-validation'

// Curated destination data for fallback scenarios
export interface CuratedDestination {
  name: string
  country: string
  region: string
  popularMonths: string[]
  averageBudgetPerDay: {
    budget: number
    midRange: number
    luxury: number
    currency: string
  }
  topAttractions: CuratedAttraction[]
  recommendations: {
    restaurants: CuratedVenue[]
    experiences: CuratedVenue[]
    accommodations: CuratedVenue[]
  }
  practicalInfo: {
    currency: string
    language: string
    timeZone: string
    emergencyNumber: string
    embassy?: string
    hospitals: string[]
    transportation: string[]
    culturalTips: string[]
    safety: string
  }
}

export interface CuratedAttraction {
  name: string
  type: 'attraction' | 'experience' | 'restaurant' | 'accommodation'
  description: string
  location: {
    name: string
    address: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  pricing: {
    amount: number
    currency: string
    priceType: 'per_person' | 'per_group' | 'free'
  }
  duration: string
  timeSlots: ('morning' | 'afternoon' | 'evening')[]
  tips: string[]
  bookingRequired: boolean
  accessibility: {
    wheelchairAccessible: boolean
    hasElevator: boolean
    notes: string
  }
  interests: string[]
}

export interface CuratedVenue {
  name: string
  type: string
  description: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  priceRange: number // 1-4 scale
  rating: number
  tips: string[]
}

// Curated data for popular destinations
export const curatedDestinations: Record<string, CuratedDestination> = {
  'paris-france': {
    name: 'Paris',
    country: 'France',
    region: 'Europe',
    popularMonths: ['April', 'May', 'June', 'September', 'October'],
    averageBudgetPerDay: {
      budget: 80,
      midRange: 150,
      luxury: 300,
      currency: 'EUR'
    },
    topAttractions: [
      {
        name: 'Eiffel Tower',
        type: 'attraction',
        description: 'Iconic iron lattice tower and symbol of Paris, offering spectacular city views from multiple levels.',
        location: {
          name: 'Eiffel Tower',
          address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
          coordinates: { lat: 48.8584, lng: 2.2945 }
        },
        pricing: { amount: 25, currency: 'EUR', priceType: 'per_person' },
        duration: '120 minutes',
        timeSlots: ['morning', 'afternoon', 'evening'],
        tips: ['Book tickets online to skip lines', 'Visit at sunset for best photos', 'Allow extra time for security checks'],
        bookingRequired: true,
        accessibility: {
          wheelchairAccessible: true,
          hasElevator: true,
          notes: 'Elevators available to second floor, stairs only to top'
        },
        interests: ['culture', 'photography', 'romance']
      },
      {
        name: 'Louvre Museum',
        type: 'attraction',
        description: "World's largest art museum housing the Mona Lisa, Venus de Milo, and thousands of masterpieces.",
        location: {
          name: 'Louvre Museum',
          address: 'Rue de Rivoli, 75001 Paris, France',
          coordinates: { lat: 48.8606, lng: 2.3376 }
        },
        pricing: { amount: 17, currency: 'EUR', priceType: 'per_person' },
        duration: '180 minutes',
        timeSlots: ['morning', 'afternoon'],
        tips: ['Free on first Sunday mornings', 'Book timed entry tickets', 'Focus on specific wings to avoid overwhelm'],
        bookingRequired: true,
        accessibility: {
          wheelchairAccessible: true,
          hasElevator: true,
          notes: 'Full wheelchair access with free wheelchair loans available'
        },
        interests: ['culture', 'art', 'photography']
      },
      {
        name: 'Seine River Cruise',
        type: 'experience',
        description: 'Scenic boat cruise along the Seine offering unique perspectives of Parisian landmarks.',
        location: {
          name: 'Port de la Bourdonnais',
          address: 'Port de la Bourdonnais, 75007 Paris, France',
          coordinates: { lat: 48.8606, lng: 2.2977 }
        },
        pricing: { amount: 15, currency: 'EUR', priceType: 'per_person' },
        duration: '60 minutes',
        timeSlots: ['morning', 'afternoon', 'evening'],
        tips: ['Evening cruises offer illuminated monuments', 'Dress warmly in winter', 'Sit on the right side for Eiffel Tower views'],
        bookingRequired: false,
        accessibility: {
          wheelchairAccessible: true,
          hasElevator: false,
          notes: 'Most boats have wheelchair access via ramps'
        },
        interests: ['romance', 'photography', 'relaxation']
      }
    ],
    recommendations: {
      restaurants: [
        {
          name: 'L\'As du Fallafel',
          type: 'Street Food',
          description: 'Famous falafel shop in the Marais district, beloved by locals and tourists.',
          address: '34 Rue des Rosiers, 75004 Paris, France',
          coordinates: { lat: 48.8571, lng: 2.3598 },
          priceRange: 1,
          rating: 4.5,
          tips: ['Cash only', 'Expect long lines during lunch', 'Try the special with eggplant']
        },
        {
          name: 'Breizh Café',
          type: 'Crêperie',
          description: 'Modern crêperie serving creative sweet and savory buckwheat galettes.',
          address: '109 Rue Vieille du Temple, 75003 Paris, France',
          coordinates: { lat: 48.8614, lng: 2.3628 },
          priceRange: 2,
          rating: 4.7,
          tips: ['Reservations recommended', 'Try the Japanese-inspired options', 'Great for brunch']
        }
      ],
      experiences: [
        {
          name: 'Montmartre Walking Tour',
          type: 'Cultural Tour',
          description: 'Explore the artistic heart of Paris with local guide stories.',
          address: 'Place du Tertre, 75018 Paris, France',
          coordinates: { lat: 48.8867, lng: 2.3431 },
          priceRange: 2,
          rating: 4.6,
          tips: ['Wear comfortable shoes', 'Start early to avoid crowds', 'Bring camera for street art']
        }
      ],
      accommodations: [
        {
          name: 'Hotel des Grands Boulevards',
          type: 'Boutique Hotel',
          description: 'Stylish hotel in the historic Grands Boulevards district.',
          address: '17 Boulevard Poissonnière, 75002 Paris, France',
          coordinates: { lat: 48.8713, lng: 2.3431 },
          priceRange: 3,
          rating: 4.4,
          tips: ['Great central location', 'Excellent breakfast', 'Book directly for best rates']
        }
      ]
    },
    practicalInfo: {
      currency: 'EUR',
      language: 'French',
      timeZone: 'CET',
      emergencyNumber: '112',
      embassy: 'Contact your embassy for assistance',
      hospitals: ['Hôpital Saint-Louis', 'Hôpital Pitié-Salpêtrière'],
      transportation: ['Metro', 'Bus', 'Vélib bike sharing', 'Walking'],
      culturalTips: [
        'Greet shopkeepers with "Bonjour/Bonsoir"',
        'Tipping 5-10% is appreciated but not required',
        'Many shops close on Sundays',
        'Dress modestly when visiting churches'
      ],
      safety: 'Generally safe city. Watch for pickpockets in tourist areas and on public transport.'
    }
  },

  'tokyo-japan': {
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    popularMonths: ['March', 'April', 'May', 'October', 'November'],
    averageBudgetPerDay: {
      budget: 60,
      midRange: 120,
      luxury: 250,
      currency: 'JPY'
    },
    topAttractions: [
      {
        name: 'Senso-ji Temple',
        type: 'attraction',
        description: 'Ancient Buddhist temple in Asakusa, Tokyo\'s oldest temple with traditional shopping street.',
        location: {
          name: 'Senso-ji Temple',
          address: '2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
          coordinates: { lat: 35.7148, lng: 139.7967 }
        },
        pricing: { amount: 0, currency: 'JPY', priceType: 'free' },
        duration: '90 minutes',
        timeSlots: ['morning', 'afternoon'],
        tips: ['Visit early morning for fewer crowds', 'Try traditional snacks on Nakamise street', 'Remove hat when entering temple'],
        bookingRequired: false,
        accessibility: {
          wheelchairAccessible: true,
          hasElevator: false,
          notes: 'Main temple accessible via ramps, some areas have steps'
        },
        interests: ['culture', 'spiritual', 'photography']
      }
    ],
    recommendations: {
      restaurants: [
        {
          name: 'Tsukiji Outer Market',
          type: 'Food Market',
          description: 'Fresh sushi and street food in the famous fish market area.',
          address: 'Tsukiji, Chuo City, Tokyo, Japan',
          coordinates: { lat: 35.6654, lng: 139.7707 },
          priceRange: 2,
          rating: 4.8,
          tips: ['Go early for freshest fish', 'Cash only at most stalls', 'Try the tuna sashimi']
        }
      ],
      experiences: [
        {
          name: 'Tokyo Skytree',
          type: 'Observation Deck',
          description: 'Tallest structure in Japan with panoramic city views.',
          address: '1-1-2 Oshiage, Sumida City, Tokyo, Japan',
          coordinates: { lat: 35.7101, lng: 139.8107 },
          priceRange: 3,
          rating: 4.5,
          tips: ['Book timed tickets online', 'Clear days offer Mount Fuji views', 'Visit at sunset']
        }
      ],
      accommodations: [
        {
          name: 'Capsule Hotel Anshin Oyado',
          type: 'Capsule Hotel',
          description: 'Modern capsule hotel experience in central Tokyo.',
          address: '3-4-5 Nihonbashi, Chuo City, Tokyo, Japan',
          coordinates: { lat: 35.6795, lng: 139.7731 },
          priceRange: 1,
          rating: 4.2,
          tips: ['Unique Japanese experience', 'Shared facilities', 'Book early for weekend stays']
        }
      ]
    },
    practicalInfo: {
      currency: 'JPY',
      language: 'Japanese',
      timeZone: 'JST',
      emergencyNumber: '110',
      hospitals: ['Tokyo University Hospital', 'St. Luke\'s International Hospital'],
      transportation: ['JR Lines', 'Tokyo Metro', 'Buses', 'Taxis'],
      culturalTips: [
        'Bow when greeting',
        'Remove shoes when entering homes/temples',
        'Don\'t eat while walking',
        'Be quiet on public transportation'
      ],
      safety: 'Extremely safe city with very low crime rates. Natural disasters (earthquakes) possible.'
    }
  }
}

// Fallback generation service
export class FallbackService {
  
  // Get curated destination data
  getCuratedDestination(destination: string): CuratedDestination | null {
    const normalizedDestination = this.normalizeDestinationName(destination)
    return curatedDestinations[normalizedDestination] || null
  }

  // Generate fallback itinerary using curated data
  generateFallbackItinerary(
    destination: string,
    duration: number,
    interests: string[],
    budget: number,
    currency: string,
    startDate: Date
  ): ItineraryResponse {
    const curatedData = this.getCuratedDestination(destination)
    
    if (!curatedData) {
      return this.generateGenericFallback(destination, duration, budget, currency, startDate)
    }

    // Filter attractions by interests
    const relevantAttractions = curatedData.topAttractions.filter(attraction =>
      attraction.interests.some(interest => interests.includes(interest))
    )

    // Generate days
    const days = []
    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayNum - 1)

      const dayAttractions = this.selectDayAttractions(
        relevantAttractions,
        curatedData.recommendations,
        dayNum,
        budget / duration,
        currency
      )

      days.push({
        day: dayNum,
        date: currentDate.toISOString().split('T')[0],
        theme: this.generateDayTheme(dayNum, duration),
        activities: dayAttractions,
        dailyBudget: {
          amount: Math.round(budget / duration),
          currency: currency
        },
        transportation: {
          primaryMethod: 'public',
          estimatedCost: 20,
          notes: curatedData.practicalInfo.transportation.join(', ') + ' available'
        }
      })
    }

    return {
      itinerary: {
        destination: curatedData.name,
        duration,
        totalBudgetEstimate: {
          amount: budget,
          currency,
          breakdown: {
            accommodation: Math.round(budget * 0.4),
            food: Math.round(budget * 0.3),
            activities: Math.round(budget * 0.2),
            transportation: Math.round(budget * 0.08),
            other: Math.round(budget * 0.02)
          }
        },
        days,
        generalTips: curatedData.practicalInfo.culturalTips,
        emergencyInfo: {
          emergencyNumber: curatedData.practicalInfo.emergencyNumber,
          embassy: curatedData.practicalInfo.embassy || 'Contact your embassy',
          hospitals: curatedData.practicalInfo.hospitals
        }
      }
    }
  }

  // Select activities for a specific day
  private selectDayAttractions(
    attractions: CuratedAttraction[],
    recommendations: CuratedDestination['recommendations'],
    dayNum: number,
    dailyBudget: number,
    currency: string
  ) {
    const activities = []
    let currentBudget = dailyBudget

    // Morning activity
    const morningAttractions = attractions.filter(a => 
      a.timeSlots.includes('morning') && a.pricing.amount <= currentBudget
    )
    if (morningAttractions.length > 0) {
      const selected = morningAttractions[dayNum % morningAttractions.length]
      activities.push(this.convertToActivity(selected, 'morning', '09:00', '11:00'))
      currentBudget -= selected.pricing.amount
    }

    // Lunch
    const restaurants = recommendations.restaurants.filter(r => 
      this.estimateRestaurantCost(r.priceRange, currency) <= currentBudget
    )
    if (restaurants.length > 0) {
      const restaurant = restaurants[dayNum % restaurants.length]
      activities.push(this.convertVenueToActivity(restaurant, 'afternoon', '12:00', '13:30', 'restaurant'))
      currentBudget -= this.estimateRestaurantCost(restaurant.priceRange, currency)
    }

    // Afternoon activity
    const afternoonAttractions = attractions.filter(a => 
      a.timeSlots.includes('afternoon') && a.pricing.amount <= currentBudget
    )
    if (afternoonAttractions.length > 0) {
      const selected = afternoonAttractions[(dayNum + 1) % afternoonAttractions.length]
      activities.push(this.convertToActivity(selected, 'afternoon', '14:30', '16:30'))
      currentBudget -= selected.pricing.amount
    }

    // Evening activity
    const eveningAttractions = attractions.filter(a => 
      a.timeSlots.includes('evening') && a.pricing.amount <= currentBudget
    )
    if (eveningAttractions.length > 0) {
      const selected = eveningAttractions[(dayNum + 2) % eveningAttractions.length]
      activities.push(this.convertToActivity(selected, 'evening', '19:00', '21:00'))
    }

    return activities
  }

  // Convert curated attraction to activity format
  private convertToActivity(
    attraction: CuratedAttraction,
    timeSlot: 'morning' | 'afternoon' | 'evening',
    startTime: string,
    endTime: string
  ) {
    return {
      id: `fallback_${attraction.name.toLowerCase().replace(/\s+/g, '_')}`,
      timeSlot,
      startTime,
      endTime,
      name: attraction.name,
      type: attraction.type,
      description: attraction.description,
      location: attraction.location,
      pricing: attraction.pricing,
      duration: attraction.duration,
      tips: attraction.tips,
      bookingRequired: attraction.bookingRequired,
      accessibility: attraction.accessibility
    }
  }

  // Convert venue to activity format
  private convertVenueToActivity(
    venue: CuratedVenue,
    timeSlot: 'morning' | 'afternoon' | 'evening',
    startTime: string,
    endTime: string,
    type: 'restaurant' | 'experience' | 'attraction'
  ) {
    return {
      id: `fallback_${venue.name.toLowerCase().replace(/\s+/g, '_')}`,
      timeSlot,
      startTime,
      endTime,
      name: venue.name,
      type,
      description: venue.description,
      location: {
        name: venue.name,
        address: venue.address,
        coordinates: venue.coordinates
      },
      pricing: {
        amount: this.estimateRestaurantCost(venue.priceRange, 'USD'),
        currency: 'USD',
        priceType: 'per_person' as const
      },
      duration: '90 minutes',
      tips: venue.tips,
      bookingRequired: venue.priceRange > 2,
      accessibility: {
        wheelchairAccessible: true,
        hasElevator: false,
        notes: 'Contact venue for accessibility details'
      }
    }
  }

  // Estimate restaurant cost based on price range
  private estimateRestaurantCost(priceRange: number, currency: string): number {
    const baseCosts: Record<string, number[]> = {
      'USD': [15, 35, 60, 120],
      'EUR': [12, 30, 55, 100],
      'JPY': [1500, 3500, 6000, 12000],
      'GBP': [10, 25, 45, 90]
    }
    
    const costs = baseCosts[currency] || baseCosts['USD']
    return costs[priceRange - 1] || costs[1]
  }

  // Generate day theme
  private generateDayTheme(dayNum: number, totalDays: number): string {
    if (totalDays === 1) return 'Highlights of the city'
    if (dayNum === 1) return 'Arrival and orientation'
    if (dayNum === totalDays) return 'Final day and departure'
    
    const themes = [
      'Cultural exploration',
      'Local experiences',
      'Historical discovery',
      'Food and markets',
      'Art and creativity',
      'Nature and relaxation'
    ]
    
    return themes[(dayNum - 2) % themes.length]
  }

  // Generate generic fallback for unknown destinations
  private generateGenericFallback(
    destination: string,
    duration: number,
    budget: number,
    currency: string,
    startDate: Date
  ): ItineraryResponse {
    const days = []
    
    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayNum - 1)

      days.push({
        day: dayNum,
        date: currentDate.toISOString().split('T')[0],
        theme: this.generateDayTheme(dayNum, duration),
        activities: [
          {
            id: `generic_morning_${dayNum}`,
            timeSlot: 'morning' as const,
            startTime: '09:00',
            endTime: '11:00',
            name: 'City Center Exploration',
            type: 'attraction' as const,
            description: 'Explore the main attractions and landmarks in the city center.',
            location: {
              name: `${destination} City Center`,
              address: `Central ${destination}`,
              coordinates: { lat: 0, lng: 0 }
            },
            pricing: { amount: 0, currency, priceType: 'free' as const },
            duration: '120 minutes',
            tips: ['Wear comfortable walking shoes', 'Bring camera', 'Ask locals for recommendations'],
            bookingRequired: false,
            accessibility: {
              wheelchairAccessible: true,
              hasElevator: false,
              notes: 'Most city centers have accessible paths'
            }
          },
          {
            id: `generic_lunch_${dayNum}`,
            timeSlot: 'afternoon' as const,
            startTime: '12:00',
            endTime: '13:30',
            name: 'Local Restaurant',
            type: 'restaurant' as const,
            description: 'Try authentic local cuisine at a recommended restaurant.',
            location: {
              name: 'Local Restaurant',
              address: `${destination}`,
              coordinates: { lat: 0, lng: 0 }
            },
            pricing: { amount: Math.round(budget / duration * 0.3), currency, priceType: 'per_person' as const },
            duration: '90 minutes',
            tips: ['Ask for menu recommendations', 'Try local specialties', 'Learn basic local phrases'],
            bookingRequired: false,
            accessibility: {
              wheelchairAccessible: true,
              hasElevator: false,
              notes: 'Most restaurants accommodate accessibility needs'
            }
          }
        ],
        dailyBudget: {
          amount: Math.round(budget / duration),
          currency
        },
        transportation: {
          primaryMethod: 'public',
          estimatedCost: 10,
          notes: 'Use local public transportation or walking'
        }
      })
    }

    return {
      itinerary: {
        destination,
        duration,
        totalBudgetEstimate: {
          amount: budget,
          currency,
          breakdown: {
            accommodation: Math.round(budget * 0.4),
            food: Math.round(budget * 0.3),
            activities: Math.round(budget * 0.2),
            transportation: Math.round(budget * 0.08),
            other: Math.round(budget * 0.02)
          }
        },
        days,
        generalTips: [
          'Research local customs and etiquette',
          'Keep copies of important documents',
          'Learn basic phrases in the local language',
          'Stay aware of your surroundings'
        ],
        emergencyInfo: {
          emergencyNumber: '911',
          embassy: 'Contact your embassy for assistance',
          hospitals: ['Local Hospital', 'Medical Center']
        }
      }
    }
  }

  // Normalize destination name for lookup
  private normalizeDestinationName(destination: string): string {
    return destination
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^the-/, '')
  }

  // Check if curated data exists for destination
  hasCuratedData(destination: string): boolean {
    const normalized = this.normalizeDestinationName(destination)
    return normalized in curatedDestinations
  }

  // Get list of available curated destinations
  getAvailableDestinations(): string[] {
    return Object.values(curatedDestinations).map(dest => `${dest.name}, ${dest.country}`)
  }

  // Add new curated destination (for expansion)
  addCuratedDestination(key: string, data: CuratedDestination): void {
    curatedDestinations[key] = data
  }
}

// Export singleton instance
export const fallbackService = new FallbackService()

// Export utility functions
export function isFallbackItinerary(itinerary: ItineraryResponse): boolean {
  return itinerary.itinerary.days.some(day =>
    day.activities.some(activity => activity.id.startsWith('fallback_') || activity.id.startsWith('generic_'))
  )
}

export function getFallbackQuality(destination: string): 'high' | 'medium' | 'low' {
  if (fallbackService.hasCuratedData(destination)) {
    return 'high'
  }
  return 'low' // Generic fallback
}