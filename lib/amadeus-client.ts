import { format, addDays } from 'date-fns'

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  adults: number
  children?: number
  infants?: number
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
  maxResults?: number
}

export interface FlightOffer {
  id: string
  price: {
    total: string
    currency: string
    base: string
    fees: Array<{
      amount: string
      type: string
    }>
  }
  itineraries: Array<{
    duration: string
    segments: Array<{
      departure: {
        iataCode: string
        terminal?: string
        at: string
      }
      arrival: {
        iataCode: string
        terminal?: string
        at: string
      }
      carrierCode: string
      number: string
      aircraft: {
        code: string
      }
      operating?: {
        carrierCode: string
      }
      duration: string
      stops: number
    }>
  }>
  price_last_updated: string
  bookingUrl?: string
  validatingAirlineCodes: string[]
  travelerPricings: Array<{
    travelerId: string
    fareOption: string
    travelerType: 'ADULT' | 'CHILD' | 'SENIOR' | 'YOUNG' | 'HELD_INFANT' | 'SEATED_INFANT' | 'STUDENT'
    price: {
      currency: string
      total: string
      base: string
    }
  }>
}

export interface AirportInfo {
  iataCode: string
  name: string
  city: string
  country: string
}

export interface FlightSearchResponse {
  data: FlightOffer[]
  meta: {
    count: number
    links?: {
      self: string
      next?: string
      previous?: string
      last?: string
      first?: string
    }
  }
  dictionaries?: {
    locations: Record<string, AirportInfo>
    aircraft: Record<string, string>
    carriers: Record<string, string>
    currencies: Record<string, string>
  }
}

class AmadeusClient {
  private baseUrl = 'https://test.api.amadeus.com/v2'
  private tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token'
  private accessToken: string | null = null
  private tokenExpiration: number = 0

  constructor(
    private clientId: string = process.env.AMADEUS_CLIENT_ID || '',
    private clientSecret: string = process.env.AMADEUS_CLIENT_SECRET || ''
  ) {
    if (!this.clientId || !this.clientSecret) {
      console.warn('Amadeus API credentials not configured. Flight search will be disabled.')
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken
    }

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      })

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer

      return this.accessToken
    } catch (error) {
      console.error('Failed to get Amadeus access token:', error)
      throw new Error('Unable to authenticate with Amadeus API')
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const token = await this.getAccessToken()
    
    const url = new URL(`${this.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(`Amadeus API error: ${response.status} ${response.statusText} - ${errorData?.error_description || 'Unknown error'}`)
    }

    return response.json()
  }

  /**
   * Search for flight offers
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResponse> {
    try {
      const searchParams = {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.adults,
        children: params.children || 0,
        infants: params.infants || 0,
        travelClass: params.travelClass || 'ECONOMY',
        max: params.maxResults || 50,
        currencyCode: 'USD'
      }

      const response = await this.makeRequest('/shopping/flight-offers', searchParams)
      
      // Add booking URLs to flight offers
      if (response.data) {
        response.data = response.data.map((offer: FlightOffer) => ({
          ...offer,
          bookingUrl: this.generateBookingUrl(offer, params),
          price_last_updated: new Date().toISOString()
        }))
      }

      return response
    } catch (error) {
      console.error('Flight search error:', error)
      throw new Error(`Flight search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get airport suggestions
   */
  async searchAirports(query: string): Promise<AirportInfo[]> {
    try {
      const response = await this.makeRequest('/reference-data/locations', {
        keyword: query,
        subType: 'AIRPORT,CITY'
      })

      return response.data?.map((location: any) => ({
        iataCode: location.iataCode,
        name: location.name,
        city: location.address?.cityName || '',
        country: location.address?.countryName || ''
      })) || []
    } catch (error) {
      console.error('Airport search error:', error)
      return []
    }
  }

  /**
   * Get flight price alerts (simplified implementation)
   */
  async createPriceAlert(params: FlightSearchParams & { alertId: string }): Promise<boolean> {
    try {
      // In a real implementation, this would set up price monitoring
      // For now, we'll just validate the route and return success
      await this.searchFlights({
        ...params,
        maxResults: 1
      })
      
      return true
    } catch (error) {
      console.error('Price alert creation error:', error)
      return false
    }
  }

  /**
   * Generate affiliate booking URL
   */
  private generateBookingUrl(offer: FlightOffer, searchParams: FlightSearchParams): string {
    // This would typically integrate with your affiliate partner
    // For now, generate a tracking URL that redirects to a booking site
    const trackingParams = new URLSearchParams({
      origin: searchParams.origin,
      destination: searchParams.destination,
      departure: searchParams.departureDate,
      return: searchParams.returnDate || '',
      adults: searchParams.adults.toString(),
      price: offer.price.total,
      currency: offer.price.currency,
      carrier: offer.validatingAirlineCodes[0] || '',
      affiliate_id: 'terravoyage',
      offer_id: offer.id
    })

    return `/api/booking/flight-redirect?${trackingParams.toString()}`
  }

  /**
   * Get historical pricing data (mock implementation)
   */
  async getPriceHistory(
    origin: string, 
    destination: string, 
    days: number = 30
  ): Promise<Array<{ date: string; price: number }>> {
    // In a real implementation, this would query historical data
    // For now, generate mock data
    const history = []
    const basePrice = 300 + Math.random() * 500
    
    for (let i = days; i >= 0; i--) {
      const date = format(addDays(new Date(), -i), 'yyyy-MM-dd')
      const variation = (Math.random() - 0.5) * 0.3 // ±15% variation
      const price = Math.round(basePrice * (1 + variation))
      
      history.push({ date, price })
    }
    
    return history
  }

  /**
   * Check if API is configured and available
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret)
  }

  /**
   * Get supported airlines
   */
  async getAirlines(): Promise<Record<string, string>> {
    try {
      const response = await this.makeRequest('/reference-data/airlines')
      const airlines: Record<string, string> = {}
      
      response.data?.forEach((airline: any) => {
        airlines[airline.icaoCode || airline.iataCode] = airline.businessName || airline.commonName
      })
      
      return airlines
    } catch (error) {
      console.error('Airlines fetch error:', error)
      return {}
    }
  }
}

// Singleton instance
export const amadeusClient = new AmadeusClient()

// Mock data for development/testing when API is not configured
export const mockFlightData: FlightSearchResponse = {
  data: [
    {
      id: 'mock-flight-1',
      price: {
        total: '299.99',
        currency: 'USD',
        base: '250.00',
        fees: [
          { amount: '49.99', type: 'SUPPLIER' }
        ]
      },
      itineraries: [
        {
          duration: 'PT5H30M',
          segments: [
            {
              departure: {
                iataCode: 'JFK',
                at: '2024-03-15T08:00:00'
              },
              arrival: {
                iataCode: 'LAX',
                at: '2024-03-15T11:30:00'
              },
              carrierCode: 'AA',
              number: '123',
              aircraft: { code: '738' },
              duration: 'PT5H30M',
              stops: 0
            }
          ]
        }
      ],
      price_last_updated: new Date().toISOString(),
      bookingUrl: '/api/booking/flight-redirect?mock=true',
      validatingAirlineCodes: ['AA'],
      travelerPricings: [
        {
          travelerId: '1',
          fareOption: 'STANDARD',
          travelerType: 'ADULT',
          price: {
            currency: 'USD',
            total: '299.99',
            base: '250.00'
          }
        }
      ]
    }
  ],
  meta: {
    count: 1
  },
  dictionaries: {
    locations: {
      'JFK': {
        iataCode: 'JFK',
        name: 'John F Kennedy International Airport',
        city: 'New York',
        country: 'United States'
      },
      'LAX': {
        iataCode: 'LAX',
        name: 'Los Angeles International Airport',
        city: 'Los Angeles',
        country: 'United States'
      }
    },
    carriers: {
      'AA': 'American Airlines'
    },
    aircraft: {
      '738': 'Boeing 737-800'
    },
    currencies: {
      'USD': 'US Dollar'
    }
  }
}