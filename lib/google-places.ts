"use client"

import { Loader } from "@googlemaps/js-api-loader"

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
  private loader: Loader

  constructor() {
    this.loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places"],
    })
  }

  async initialize(): Promise<void> {
    if (googlePlacesLoaded) return

    try {
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
      console.log("✅ Google Places API loaded successfully")
    } catch (error) {
      console.error("❌ Failed to load Google Places API:", error)
      throw error
    }
  }

  async searchDestinations(query: string): Promise<PlaceResult[]> {
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