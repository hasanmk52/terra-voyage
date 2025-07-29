"use client"

import { mockDestinations, mockPlaceDetails, simulateDelay } from "./mock-data"
import { useMockMaps } from "./selective-mocks"
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
    const getMockResults = (query: string) => {
      const filteredDestinations = mockDestinations.filter(destination =>
        destination.description.toLowerCase().includes(query.toLowerCase()) ||
        destination.mainText.toLowerCase().includes(query.toLowerCase())
      )
      return filteredDestinations.slice(0, 5) // Limit to 5 results like a real API
    }

    // Use circuit breaker with fallback to mock data
    return circuitBreakers.maps.execute(
      async () => {
        // Use mock data if mocks are enabled
        if (useMockMaps) {
          await simulateDelay('maps')
          return getMockResults(query)
        }

        if (!this.apiKey) {
          throw new Error("Google Maps API key not configured")
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
      },
      async () => {
        // Fallback to mock data
        console.log("Using Google Places mock data as fallback");
        await simulateDelay('maps')
        return getMockResults(query)
      }
    );
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    // Use mock data if mocks are enabled
    if (useMockMaps) {
      await simulateDelay('maps')
      const mockDetail = mockPlaceDetails[placeId]
      return mockDetail || null
    }

    if (!this.apiKey) {
      console.error("Google Maps API key not configured, using mock data")
      await simulateDelay('maps')
      const mockDetail = mockPlaceDetails[placeId]
      return mockDetail || null
    }

    try {
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
    } catch (error) {
      console.error("Place Details fetch failed, falling back to mock data:", error)
      await simulateDelay('maps')
      const mockDetail = mockPlaceDetails[placeId]
      return mockDetail || null
    }
  }

  async searchNearbyAttractions(
    location: { lat: number; lng: number },
    radius: number = 5000
  ): Promise<PlaceDetails[]> {
    // Use mock data if mocks are enabled
    if (useMockMaps) {
      await simulateDelay('maps')
      
      // Return some mock attractions near the location
      const mockAttractions: PlaceDetails[] = [
        {
          placeId: "mock-attraction-1",
          name: "Mock Museum",
          formattedAddress: "123 Tourist Street",
          geometry: {
            location: {
              lat: location.lat + 0.001,
              lng: location.lng + 0.001,
            },
          },
          types: ["tourist_attraction", "museum"],
          rating: 4.5,
        },
        {
          placeId: "mock-attraction-2", 
          name: "Mock Park",
          formattedAddress: "456 Park Avenue",
          geometry: {
            location: {
              lat: location.lat - 0.001,
              lng: location.lng - 0.001,
            },
          },
          types: ["tourist_attraction", "park"],
          rating: 4.3,
        },
      ]
      
      return mockAttractions
    }

    if (!this.apiKey) {
      console.error("Google Maps API key not configured, using mock data")
      await simulateDelay('maps')
      const mockAttractions: PlaceDetails[] = [
        {
          placeId: "mock-attraction-1",
          name: "Mock Museum",
          formattedAddress: "123 Tourist Street",
          geometry: {
            location: {
              lat: location.lat + 0.001,
              lng: location.lng + 0.001,
            },
          },
          types: ["tourist_attraction", "museum"],
          rating: 4.5,
        },
        {
          placeId: "mock-attraction-2", 
          name: "Mock Park",
          formattedAddress: "456 Park Avenue",
          geometry: {
            location: {
              lat: location.lat - 0.001,
              lng: location.lng - 0.001,
            },
          },
          types: ["tourist_attraction", "park"],
          rating: 4.3,
        },
      ]
      return mockAttractions
    }

    try {
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
    } catch (error) {
      console.error("Nearby attractions search failed, falling back to mock data:", error)
      await simulateDelay('maps')
      const mockAttractions: PlaceDetails[] = [
        {
          placeId: "mock-attraction-1",
          name: "Mock Museum",
          formattedAddress: "123 Tourist Street",
          geometry: {
            location: {
              lat: location.lat + 0.001,
              lng: location.lng + 0.001,
            },
          },
          types: ["tourist_attraction", "museum"],
          rating: 4.5,
        },
        {
          placeId: "mock-attraction-2", 
          name: "Mock Park",
          formattedAddress: "456 Park Avenue",
          geometry: {
            location: {
              lat: location.lat - 0.001,
              lng: location.lng - 0.001,
            },
          },
          types: ["tourist_attraction", "park"],
          rating: 4.3,
        },
      ]
      return mockAttractions
    }
  }
}

// Export singleton instance
export const googlePlaces = new GooglePlacesService()