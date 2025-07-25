"use client"

import { Loader } from "@googlemaps/js-api-loader"
import { mockDestinations, mockPlaceDetails, simulateDelay } from "./mock-data"
import { useMockMaps } from "./selective-mocks"

let googlePlacesLoaded = false
let placesService: google.maps.places.PlacesService | null = null
let autocompleteService: google.maps.places.AutocompleteService | null = null

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
  photos?: google.maps.places.PlacePhoto[]
  rating?: number
  website?: string
  formattedPhoneNumber?: string
}

class GooglePlacesService {
  private loader: Loader | null = null

  constructor() {
    // Only create loader if not using mocks
    if (!useMockMaps) {
      this.loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["places"],
      })
    }
  }

  async initialize(): Promise<void> {
    if (googlePlacesLoaded) return

    // Skip initialization if using mocks
    if (useMockMaps) {
      googlePlacesLoaded = true
      // Mock data initialized
      return
    }

    try {
      if (!this.loader) {
        throw new Error("Google Maps loader not initialized")
      }
      await this.loader.load()
      
      // Create a dummy map element for the PlacesService
      const mapDiv = document.createElement("div")
      const map = new google.maps.Map(mapDiv, {
        center: { lat: 0, lng: 0 },
        zoom: 1,
      })

      placesService = new google.maps.places.PlacesService(map)
      autocompleteService = new google.maps.places.AutocompleteService()
      
      googlePlacesLoaded = true
      // Google Places API loaded
    } catch (error) {
      // Failed to load Google Places API
      throw error
    }
  }

  async searchDestinations(query: string): Promise<PlaceResult[]> {
    // Use mock data if mocks are enabled
    if (useMockMaps) {
      await simulateDelay('maps')
      
      // Filter mock destinations based on query
      const filteredDestinations = mockDestinations.filter(destination =>
        destination.description.toLowerCase().includes(query.toLowerCase()) ||
        destination.mainText.toLowerCase().includes(query.toLowerCase())
      )
      
      return filteredDestinations.slice(0, 5) // Limit to 5 results like a real API
    }

    await this.initialize()

    if (!autocompleteService) {
      throw new Error("Google Places service not initialized")
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        types: ["(cities)"], // Focus on cities for travel destinations
        componentRestrictions: undefined, // Allow worldwide results
      }

      autocompleteService!.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const results: PlaceResult[] = predictions.map(prediction => ({
            placeId: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting.main_text,
            secondaryText: prediction.structured_formatting.secondary_text || "",
            types: prediction.types,
          }))
          resolve(results)
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([])
        } else {
          reject(new Error(`Places search failed: ${status}`))
        }
      })
    })
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    // Use mock data if mocks are enabled
    if (useMockMaps) {
      await simulateDelay('maps')
      const mockDetail = mockPlaceDetails[placeId]
      return mockDetail || null
    }

    await this.initialize()

    if (!placesService) {
      throw new Error("Google Places service not initialized")
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "types",
          "photos",
          "rating",
          "website",
          "formatted_phone_number",
        ],
      }

      placesService!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const details: PlaceDetails = {
            placeId: place.place_id!,
            name: place.name!,
            formattedAddress: place.formatted_address!,
            geometry: {
              location: {
                lat: place.geometry!.location!.lat(),
                lng: place.geometry!.location!.lng(),
              },
            },
            types: place.types || [],
            photos: place.photos,
            rating: place.rating,
            website: place.website,
            formattedPhoneNumber: place.formatted_phone_number,
          }
          resolve(details)
        } else {
          reject(new Error(`Place details fetch failed: ${status}`))
        }
      })
    })
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

    await this.initialize()

    if (!placesService) {
      throw new Error("Google Places service not initialized")
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius,
        type: "tourist_attraction",
      }

      placesService!.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const attractions: PlaceDetails[] = results
            .filter(place => place.place_id && place.name && place.geometry?.location)
            .map(place => ({
              placeId: place.place_id!,
              name: place.name!,
              formattedAddress: place.vicinity || "",
              geometry: {
                location: {
                  lat: place.geometry!.location!.lat(),
                  lng: place.geometry!.location!.lng(),
                },
              },
              types: place.types || [],
              photos: place.photos,
              rating: place.rating,
            }))
          resolve(attractions)
        } else {
          reject(new Error(`Nearby search failed: ${status}`))
        }
      })
    })
  }
}

// Export singleton instance
export const googlePlaces = new GooglePlacesService()