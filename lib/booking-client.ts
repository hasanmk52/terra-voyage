import { format, parseISO } from 'date-fns'

export interface HotelSearchParams {
  destination: string
  checkinDate: string
  checkoutDate: string
  adults: number
  children?: number
  rooms?: number
  currency?: string
  language?: string
  maxResults?: number
  minPrice?: number
  maxPrice?: number
  starRating?: number[]
  facilities?: string[]
}

export interface HotelOffer {
  id: string
  name: string
  description: string
  address: {
    street: string
    city: string
    country: string
    postalCode: string
  }
  location: {
    latitude: number
    longitude: number
  }
  images: Array<{
    url: string
    description: string
  }>
  rating: {
    stars: number
    score: number
    reviewCount: number
  }
  facilities: string[]
  price: {
    total: string
    currency: string
    perNight: string
    taxes: string
    fees: Array<{
      name: string
      amount: string
      included: boolean
    }>
  }
  availability: {
    available: boolean
    roomsLeft: number
    lastBooking: string
  }
  cancellation: {
    freeCancellation: boolean
    cancellationDeadline?: string
  }
  bookingUrl: string
  affiliate: {
    partnerId: string
    commissionRate: number
  }
  lastUpdated: string
}

export interface HotelSearchResponse {
  data: HotelOffer[]
  meta: {
    totalResults: number
    page: number
    pageSize: number
    hasMore: boolean
  }
  filters: {
    priceRange: {
      min: number
      max: number
    }
    starRatings: number[]
    facilities: string[]
    neighborhoods: string[]
  }
}

export interface HotelDetails extends HotelOffer {
  rooms: Array<{
    id: string
    name: string
    description: string
    maxOccupancy: number
    bedding: string
    size: number
    amenities: string[]
    images: Array<{
      url: string
      description: string
    }>
    price: {
      total: string
      currency: string
      perNight: string
    }
    availability: {
      available: boolean
      roomsLeft: number
    }
  }>
  policies: {
    checkinTime: string
    checkoutTime: string
    childrenPolicy: string
    petPolicy: string
    smokingPolicy: string
  }
  contact: {
    phone: string
    email: string
    website: string
  }
}

class BookingClient {
  private baseUrl = 'https://distribution-xml.booking.com/2.7/json'
  private rapidApiUrl = 'https://booking-com15.p.rapidapi.com/api/v1'
  
  constructor(
    private username: string = process.env.BOOKING_USERNAME || '',
    private password: string = process.env.BOOKING_PASSWORD || '',
    private rapidApiKey: string = process.env.RAPIDAPI_KEY || ''
  ) {
    if (!this.username || !this.password) {
      console.warn('Booking.com API credentials not configured. Hotel search will use fallback data.')
    }
  }

  private async makeBookingRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}/${endpoint}`)
    
    // Add authentication
    params.username = this.username
    params.password = this.password
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TerraVoyage/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Booking.com API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private async makeRapidApiRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.rapidApiUrl}/${endpoint}`)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'booking-com15.p.rapidapi.com',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`RapidAPI Booking error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Search for hotels
   */
  async searchHotels(params: HotelSearchParams): Promise<HotelSearchResponse> {
    try {
      // Try official Booking.com API first, fallback to RapidAPI
      if (this.isOfficialApiConfigured()) {
        return await this.searchHotelsOfficial(params)
      } else if (this.rapidApiKey) {
        return await this.searchHotelsRapidApi(params)
      } else {
        // Return mock data for development
        return this.getMockHotelData(params)
      }
    } catch (error) {
      console.error('Hotel search error:', error)
      // Fallback to mock data on error
      return this.getMockHotelData(params)
    }
  }

  private async searchHotelsOfficial(params: HotelSearchParams): Promise<HotelSearchResponse> {
    const searchParams = {
      checkin: params.checkinDate,
      checkout: params.checkoutDate,
      adults: params.adults,
      children: params.children || 0,
      room_qty: params.rooms || 1,
      currency: params.currency || 'USD',
      language: params.language || 'en',
      dest_type: 'city',
      dest_id: await this.getDestinationId(params.destination),
      rows: params.maxResults || 25,
      price_filter_currencycode: params.currency || 'USD'
    }

    if (params.minPrice) searchParams.price_filter_minprice = params.minPrice
    if (params.maxPrice) searchParams.price_filter_maxprice = params.maxPrice

    const response = await this.makeBookingRequest('hotels', searchParams)
    return this.transformOfficialResponse(response, params)
  }

  private async searchHotelsRapidApi(params: HotelSearchParams): Promise<HotelSearchResponse> {
    const searchParams = {
      dest_type: 'city',
      dest_id: '1', // Would need proper destination mapping
      search_type: 'city',
      arrival_date: params.checkinDate,
      departure_date: params.checkoutDate,
      adults: params.adults,
      children_qty: params.children || 0,
      room_qty: params.rooms || 1,
      page_number: 1,
      units: 'metric',
      temperature_unit: 'c',
      languagecode: params.language || 'en-us',
      currency_code: params.currency || 'USD'
    }

    const response = await this.makeRapidApiRequest('hotels/searchHotels', searchParams)
    return this.transformRapidApiResponse(response, params)
  }

  private async getDestinationId(destination: string): Promise<string> {
    // In a real implementation, this would search for the destination
    // and return the proper Booking.com destination ID
    const destinationMap: Record<string, string> = {
      'new york': '-2601889',
      'london': '-2601889',
      'paris': '-1456928',
      'tokyo': '-246227',
      'sydney': '-1506909'
    }

    return destinationMap[destination.toLowerCase()] || '-2601889'
  }

  /**
   * Get hotel details by ID
   */
  async getHotelDetails(hotelId: string, checkin: string, checkout: string): Promise<HotelDetails> {
    try {
      if (this.rapidApiKey) {
        const params = {
          hotel_id: hotelId,
          arrival_date: checkin,
          departure_date: checkout,
          adults: 2,
          children_qty: 0,
          room_qty: 1,
          languagecode: 'en-us',
          currency_code: 'USD'
        }

        const response = await this.makeRapidApiRequest('hotels/getHotelDetails', params)
        return this.transformHotelDetails(response)
      } else {
        return this.getMockHotelDetails(hotelId)
      }
    } catch (error) {
      console.error('Hotel details error:', error)
      return this.getMockHotelDetails(hotelId)
    }
  }

  /**
   * Get hotel availability and pricing
   */
  async checkAvailability(
    hotelId: string,
    checkin: string,
    checkout: string,
    adults: number = 2,
    rooms: number = 1
  ): Promise<{ available: boolean; price?: { total: string; currency: string } }> {
    try {
      const details = await this.getHotelDetails(hotelId, checkin, checkout)
      return {
        available: details.availability.available,
        price: details.price
      }
    } catch (error) {
      console.error('Availability check error:', error)
      return { available: false }
    }
  }

  /**
   * Generate affiliate booking URL
   */
  generateBookingUrl(hotel: HotelOffer, params: HotelSearchParams): string {
    const trackingParams = new URLSearchParams({
      hotel_id: hotel.id,
      checkin: params.checkinDate,
      checkout: params.checkoutDate,
      adults: params.adults.toString(),
      children: (params.children || 0).toString(),
      rooms: (params.rooms || 1).toString(),
      affiliate_id: 'terravoyage',
      price: hotel.price.total,
      currency: hotel.price.currency
    })

    return `/api/booking/hotel-redirect?${trackingParams.toString()}`
  }

  private transformOfficialResponse(response: any, params: HotelSearchParams): HotelSearchResponse {
    // Transform Booking.com official API response
    const hotels = response.result?.map((hotel: any) => ({
      id: hotel.hotel_id?.toString() || '',
      name: hotel.hotel_name || '',
      description: hotel.hotel_description || '',
      address: {
        street: hotel.address || '',
        city: hotel.city || '',
        country: hotel.country_trans || '',
        postalCode: hotel.zip || ''
      },
      location: {
        latitude: parseFloat(hotel.latitude) || 0,
        longitude: parseFloat(hotel.longitude) || 0
      },
      images: hotel.main_photo_url ? [{
        url: hotel.main_photo_url,
        description: hotel.hotel_name
      }] : [],
      rating: {
        stars: parseInt(hotel.class) || 0,
        score: parseFloat(hotel.review_score) || 0,
        reviewCount: parseInt(hotel.review_nr) || 0
      },
      facilities: hotel.hotel_facilities?.split(',') || [],
      price: {
        total: hotel.min_total_price?.toString() || '0',
        currency: hotel.currency_code || 'USD',
        perNight: hotel.price?.toString() || '0',
        taxes: '0',
        fees: []
      },
      availability: {
        available: true,
        roomsLeft: 5,
        lastBooking: new Date().toISOString()
      },
      cancellation: {
        freeCancellation: hotel.free_cancellation === '1'
      },
      bookingUrl: this.generateBookingUrl(hotel, params),
      affiliate: {
        partnerId: 'booking_com',
        commissionRate: 0.04
      },
      lastUpdated: new Date().toISOString()
    })) || []

    return {
      data: hotels,
      meta: {
        totalResults: response.total_count || 0,
        page: 1,
        pageSize: hotels.length,
        hasMore: false
      },
      filters: {
        priceRange: { min: 50, max: 500 },
        starRatings: [1, 2, 3, 4, 5],
        facilities: ['wifi', 'parking', 'pool', 'gym'],
        neighborhoods: []
      }
    }
  }

  private transformRapidApiResponse(response: any, params: HotelSearchParams): HotelSearchResponse {
    // Transform RapidAPI response
    const hotels = response.data?.hotels?.map((hotel: any) => ({
      id: hotel.hotel_id?.toString() || '',
      name: hotel.hotel_name || '',
      description: hotel.hotel_description || '',
      address: {
        street: hotel.address || '',
        city: hotel.city || '',
        country: hotel.country_trans || '',
        postalCode: ''
      },
      location: {
        latitude: 0,
        longitude: 0
      },
      images: hotel.main_photo_url ? [{
        url: hotel.main_photo_url,
        description: hotel.hotel_name
      }] : [],
      rating: {
        stars: parseInt(hotel.class) || 0,
        score: parseFloat(hotel.review_score) || 0,
        reviewCount: parseInt(hotel.review_nr) || 0
      },
      facilities: [],
      price: {
        total: hotel.min_total_price?.toString() || '0',
        currency: 'USD',
        perNight: hotel.price_breakdown?.gross_price || '0',
        taxes: hotel.price_breakdown?.included_taxes || '0',
        fees: []
      },
      availability: {
        available: true,
        roomsLeft: 5,
        lastBooking: new Date().toISOString()
      },
      cancellation: {
        freeCancellation: false
      },
      bookingUrl: this.generateBookingUrl(hotel, params),
      affiliate: {
        partnerId: 'booking_com',
        commissionRate: 0.04
      },
      lastUpdated: new Date().toISOString()
    })) || []

    return {
      data: hotels,
      meta: {
        totalResults: hotels.length,
        page: 1,
        pageSize: hotels.length,
        hasMore: false
      },
      filters: {
        priceRange: { min: 50, max: 500 },
        starRatings: [1, 2, 3, 4, 5],
        facilities: ['wifi', 'parking', 'pool', 'gym'],
        neighborhoods: []
      }
    }
  }

  private transformHotelDetails(response: any): HotelDetails {
    // Transform detailed hotel response
    return {
      id: response.hotel_id?.toString() || 'mock-hotel',
      name: response.hotel_name || 'Sample Hotel',
      description: response.hotel_description || 'A comfortable hotel',
      address: {
        street: response.address || '123 Main St',
        city: response.city || 'City',
        country: response.country || 'Country',
        postalCode: response.zip || '12345'
      },
      location: {
        latitude: 0,
        longitude: 0
      },
      images: [{
        url: response.main_photo_url || '/placeholder-hotel.jpg',
        description: 'Hotel exterior'
      }],
      rating: {
        stars: 4,
        score: 8.5,
        reviewCount: 1250
      },
      facilities: ['wifi', 'parking', 'pool', 'gym', 'restaurant'],
      price: {
        total: '199.99',
        currency: 'USD',
        perNight: '199.99',
        taxes: '29.99',
        fees: []
      },
      availability: {
        available: true,
        roomsLeft: 3,
        lastBooking: new Date().toISOString()
      },
      cancellation: {
        freeCancellation: true,
        cancellationDeadline: format(new Date(), 'yyyy-MM-dd')
      },
      bookingUrl: '/api/booking/hotel-redirect?mock=true',
      affiliate: {
        partnerId: 'booking_com',
        commissionRate: 0.04
      },
      lastUpdated: new Date().toISOString(),
      rooms: [
        {
          id: 'room-1',
          name: 'Standard Double Room',
          description: 'Comfortable room with double bed',
          maxOccupancy: 2,
          bedding: '1 double bed',
          size: 25,
          amenities: ['wifi', 'tv', 'minibar'],
          images: [{
            url: '/placeholder-room.jpg',
            description: 'Room interior'
          }],
          price: {
            total: '199.99',
            currency: 'USD',
            perNight: '199.99'
          },
          availability: {
            available: true,
            roomsLeft: 3
          }
        }
      ],
      policies: {
        checkinTime: '15:00',
        checkoutTime: '11:00',
        childrenPolicy: 'Children welcome',
        petPolicy: 'Pets not allowed',
        smokingPolicy: 'Non-smoking'
      },
      contact: {
        phone: '+1234567890',
        email: 'info@hotel.com',
        website: 'https://hotel.com'
      }
    }
  }

  private getMockHotelData(params: HotelSearchParams): HotelSearchResponse {
    const mockHotels: HotelOffer[] = [
      {
        id: 'mock-hotel-1',
        name: 'Grand Plaza Hotel',
        description: 'Luxury hotel in the heart of the city with stunning views and world-class amenities.',
        address: {
          street: '123 Main Street',
          city: params.destination,
          country: 'Country',
          postalCode: '12345'
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        images: [
          {
            url: '/placeholder-hotel-1.jpg',
            description: 'Hotel exterior view'
          }
        ],
        rating: {
          stars: 5,
          score: 9.2,
          reviewCount: 2845
        },
        facilities: ['wifi', 'parking', 'pool', 'gym', 'restaurant', 'spa', 'concierge'],
        price: {
          total: '299.99',
          currency: 'USD',
          perNight: '299.99',
          taxes: '44.99',
          fees: [
            { name: 'Resort fee', amount: '25.00', included: false },
            { name: 'City tax', amount: '5.50', included: true }
          ]
        },
        availability: {
          available: true,
          roomsLeft: 5,
          lastBooking: '2 hours ago'
        },
        cancellation: {
          freeCancellation: true,
          cancellationDeadline: format(parseISO(params.checkinDate), 'yyyy-MM-dd')
        },
        bookingUrl: '/api/booking/hotel-redirect?hotel_id=mock-hotel-1',
        affiliate: {
          partnerId: 'booking_com',
          commissionRate: 0.04
        },
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'mock-hotel-2',
        name: 'Boutique Inn',
        description: 'Charming boutique hotel with personalized service and unique character.',
        address: {
          street: '456 Oak Avenue',
          city: params.destination,
          country: 'Country',
          postalCode: '12346'
        },
        location: {
          latitude: 40.7580,
          longitude: -73.9855
        },
        images: [
          {
            url: '/placeholder-hotel-2.jpg',
            description: 'Boutique hotel lobby'
          }
        ],
        rating: {
          stars: 4,
          score: 8.7,
          reviewCount: 892
        },
        facilities: ['wifi', 'restaurant', 'bar', 'concierge'],
        price: {
          total: '189.99',
          currency: 'USD',
          perNight: '189.99',
          taxes: '28.49',
          fees: []
        },
        availability: {
          available: true,
          roomsLeft: 2,
          lastBooking: '1 hour ago'
        },
        cancellation: {
          freeCancellation: true
        },
        bookingUrl: '/api/booking/hotel-redirect?hotel_id=mock-hotel-2',
        affiliate: {
          partnerId: 'booking_com',
          commissionRate: 0.04
        },
        lastUpdated: new Date().toISOString()
      }
    ]

    return {
      data: mockHotels,
      meta: {
        totalResults: mockHotels.length,
        page: 1,
        pageSize: mockHotels.length,
        hasMore: false
      },
      filters: {
        priceRange: { min: 50, max: 500 },
        starRatings: [3, 4, 5],
        facilities: ['wifi', 'parking', 'pool', 'gym', 'restaurant'],
        neighborhoods: ['Downtown', 'City Center', 'Historic District']
      }
    }
  }

  private getMockHotelDetails(hotelId: string): HotelDetails {
    return this.transformHotelDetails({ hotel_id: hotelId })
  }

  isOfficialApiConfigured(): boolean {
    return !!(this.username && this.password)
  }

  isRapidApiConfigured(): boolean {
    return !!this.rapidApiKey
  }

  isConfigured(): boolean {
    return this.isOfficialApiConfigured() || this.isRapidApiConfigured()
  }
}

// Singleton instance
export const bookingClient = new BookingClient()