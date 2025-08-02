"use client"

import { circuitBreakers } from "./circuit-breaker"
import { retryManagers } from "./retry-logic"

let googlePlacesLoaded = false

export interface PlaceResult {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  types: string[]
}

export interface PlaceDetails {
  placeId: string
  name: string
  formattedAddress: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  photos?: any[]
  rating?: number
  website?: string
  formattedPhoneNumber?: string
}

class GooglePlacesService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  }

  // New Places API doesn't require initialization
  async initialize(): Promise<void> {
    googlePlacesLoaded = true
  }

  async searchDestinations(query: string): Promise<PlaceResult[]> {
    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.")
    }

    // Execute with retry logic
    return retryManagers.maps.execute(async () => {
      const requestBody = {
        textQuery: `${query} city destination`,
        maxResultCount: 5,
        includedType: 'locality'
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types',
          'User-Agent': 'TerraVoyage/1.0',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Places API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      if (data.places && data.places.length > 0) {
        const results: PlaceResult[] = data.places.map((place: any) => ({
          placeId: place.id,
          description: place.formattedAddress || place.displayName?.text || query,
          mainText: place.displayName?.text || query,
          secondaryText: place.formattedAddress || "",
          types: place.types || []
        }))
        return results
      }

      return []
    });
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.")
    }

    // Use the new Places API Place Details
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,rating,websiteUri,nationalPhoneNumber'
      }
    })

    if (!response.ok) {
      throw new Error(`Place Details API error: ${response.status} ${response.statusText}`)
    }

    const place = await response.json()
    
    const details: PlaceDetails = {
      placeId: place.id,
      name: place.displayName?.text || "Unknown Place",
      formattedAddress: place.formattedAddress || "",
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
      },
      types: place.types || [],
      rating: place.rating,
      website: place.websiteUri,
      formattedPhoneNumber: place.nationalPhoneNumber,
    }
    
    return details
  }

  async searchNearbyAttractions(
    location: { lat: number; lng: number },
    radius: number = 5000
  ): Promise<PlaceDetails[]> {
    if (!this.apiKey) {
      throw new Error("Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.")
    }

    // Use the new Places API Nearby Search
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating'
      },
      body: JSON.stringify({
        includedTypes: ["tourist_attraction"],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng
            },
            radius: radius
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Nearby Search API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.places && data.places.length > 0) {
      const attractions: PlaceDetails[] = data.places.map((place: any) => ({
        placeId: place.id,
        name: place.displayName?.text || "Unknown Attraction",
        formattedAddress: place.formattedAddress || "",
        geometry: {
          location: {
            lat: place.location?.latitude || location.lat,
            lng: place.location?.longitude || location.lng,
          },
        },
        types: place.types || [],
        rating: place.rating,
      }))
      return attractions
    }

    return []
  }
}

// Export singleton instance
export const googlePlaces = new GooglePlacesService()