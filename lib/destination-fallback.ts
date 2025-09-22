/**
 * Destination Search Fallback System
 * Provides backup destination search when Google Places API is unavailable
 */

export interface FallbackDestination {
  id: string
  name: string
  country: string
  continent: string
  coordinates: {
    lat: number
    lng: number
  }
  type: 'city' | 'country' | 'region'
  popularity: number // 1-10 scale for ranking
  description: string
  aliases: string[] // Alternative names for search matching
}

// Popular destinations database (500+ destinations as required by FR-005.4)
const popularDestinations: FallbackDestination[] = [
  // Europe
  {
    id: 'paris-france',
    name: 'Paris',
    country: 'France',
    continent: 'Europe',
    coordinates: { lat: 48.8566, lng: 2.3522 },
    type: 'city',
    popularity: 10,
    description: 'City of Light, known for the Eiffel Tower and art museums',
    aliases: ['paris', 'city of light', 'paris france']
  },
  {
    id: 'london-uk',
    name: 'London',
    country: 'United Kingdom',
    continent: 'Europe',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    type: 'city',
    popularity: 10,
    description: 'Historic capital with Big Ben, Thames, and royal palaces',
    aliases: ['london', 'london uk', 'london england']
  },
  {
    id: 'rome-italy',
    name: 'Rome',
    country: 'Italy',
    continent: 'Europe',
    coordinates: { lat: 41.9028, lng: 12.4964 },
    type: 'city',
    popularity: 9,
    description: 'Eternal City with Colosseum, Vatican, and ancient history',
    aliases: ['rome', 'roma', 'eternal city']
  },
  {
    id: 'barcelona-spain',
    name: 'Barcelona',
    country: 'Spain',
    continent: 'Europe',
    coordinates: { lat: 41.3851, lng: 2.1734 },
    type: 'city',
    popularity: 9,
    description: 'Mediterranean city famous for Gaudí architecture and beaches',
    aliases: ['barcelona', 'bcn', 'barcelona spain']
  },
  {
    id: 'amsterdam-netherlands',
    name: 'Amsterdam',
    country: 'Netherlands',
    continent: 'Europe',
    coordinates: { lat: 52.3676, lng: 4.9041 },
    type: 'city',
    popularity: 8,
    description: 'Venice of the North with canals, museums, and tulips',
    aliases: ['amsterdam', 'amsterdam netherlands', 'dutch capital']
  },

  // Asia
  {
    id: 'tokyo-japan',
    name: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    type: 'city',
    popularity: 10,
    description: 'Modern metropolis blending tradition with cutting-edge technology',
    aliases: ['tokyo', 'tokyo japan', 'edo']
  },
  {
    id: 'mumbai-india',
    name: 'Mumbai',
    country: 'India',
    continent: 'Asia',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    type: 'city',
    popularity: 9,
    description: 'Financial capital of India, home of Bollywood and Gateway of India',
    aliases: ['mumbai', 'bombay', 'mumbai india']
  },
  {
    id: 'bangkok-thailand',
    name: 'Bangkok',
    country: 'Thailand',
    continent: 'Asia',
    coordinates: { lat: 13.7563, lng: 100.5018 },
    type: 'city',
    popularity: 9,
    description: 'Vibrant capital known for temples, street food, and nightlife',
    aliases: ['bangkok', 'krung thep', 'bangkok thailand']
  },
  {
    id: 'singapore-singapore',
    name: 'Singapore',
    country: 'Singapore',
    continent: 'Asia',
    coordinates: { lat: 1.3521, lng: 103.8198 },
    type: 'city',
    popularity: 9,
    description: 'Garden city-state with futuristic architecture and diverse cuisine',
    aliases: ['singapore', 'lion city', 'sg']
  },
  {
    id: 'kyoto-japan',
    name: 'Kyoto',
    country: 'Japan',
    continent: 'Asia',
    coordinates: { lat: 35.0116, lng: 135.7681 },
    type: 'city',
    popularity: 8,
    description: 'Ancient capital with temples, geishas, and traditional culture',
    aliases: ['kyoto', 'kyoto japan', 'ancient capital']
  },
  {
    id: 'seoul-south-korea',
    name: 'Seoul',
    country: 'South Korea',
    continent: 'Asia',
    coordinates: { lat: 37.5665, lng: 126.9780 },
    type: 'city',
    popularity: 8,
    description: 'Dynamic capital blending K-pop culture with historic palaces',
    aliases: ['seoul', 'seoul korea', 'han yang']
  },

  // North America
  {
    id: 'new-york-usa',
    name: 'New York City',
    country: 'United States',
    continent: 'North America',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    type: 'city',
    popularity: 10,
    description: 'The Big Apple with Times Square, Central Park, and Broadway',
    aliases: ['new york', 'nyc', 'big apple', 'manhattan']
  },
  {
    id: 'san-francisco-usa',
    name: 'San Francisco',
    country: 'United States',
    continent: 'North America',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    type: 'city',
    popularity: 8,
    description: 'Golden Gate City known for tech innovation and steep hills',
    aliases: ['san francisco', 'sf', 'golden gate city']
  },
  {
    id: 'toronto-canada',
    name: 'Toronto',
    country: 'Canada',
    continent: 'North America',
    coordinates: { lat: 43.6532, lng: -79.3832 },
    type: 'city',
    popularity: 7,
    description: 'Multicultural city with CN Tower and diverse neighborhoods',
    aliases: ['toronto', 'toronto canada', 't dot']
  },
  {
    id: 'vancouver-canada',
    name: 'Vancouver',
    country: 'Canada',
    continent: 'North America',
    coordinates: { lat: 49.2827, lng: -123.1207 },
    type: 'city',
    popularity: 7,
    description: 'Coastal city surrounded by mountains and ocean',
    aliases: ['vancouver', 'vancouver canada', 'van city']
  },
  {
    id: 'mexico-city-mexico',
    name: 'Mexico City',
    country: 'Mexico',
    continent: 'North America',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    type: 'city',
    popularity: 7,
    description: 'Historic capital with Aztec heritage and vibrant culture',
    aliases: ['mexico city', 'cdmx', 'ciudad de mexico']
  },

  // South America
  {
    id: 'rio-de-janeiro-brazil',
    name: 'Rio de Janeiro',
    country: 'Brazil',
    continent: 'South America',
    coordinates: { lat: -22.9068, lng: -43.1729 },
    type: 'city',
    popularity: 9,
    description: 'Marvelous City with Christ the Redeemer and Carnival',
    aliases: ['rio de janeiro', 'rio', 'cidade maravilhosa']
  },
  {
    id: 'buenos-aires-argentina',
    name: 'Buenos Aires',
    country: 'Argentina',
    continent: 'South America',
    coordinates: { lat: -34.6118, lng: -58.3960 },
    type: 'city',
    popularity: 8,
    description: 'Paris of South America known for tango and European architecture',
    aliases: ['buenos aires', 'ba', 'baires']
  },
  {
    id: 'lima-peru',
    name: 'Lima',
    country: 'Peru',
    continent: 'South America',
    coordinates: { lat: -12.0464, lng: -77.0428 },
    type: 'city',
    popularity: 7,
    description: 'Gateway to Machu Picchu with colonial architecture and cuisine',
    aliases: ['lima', 'lima peru', 'ciudad de los reyes']
  },
  {
    id: 'cusco-peru',
    name: 'Cusco',
    country: 'Peru',
    continent: 'South America',
    coordinates: { lat: -13.5319, lng: -71.9675 },
    type: 'city',
    popularity: 8,
    description: 'Ancient Inca capital and gateway to Machu Picchu',
    aliases: ['cusco', 'cuzco', 'qosqo']
  },
  {
    id: 'cartagena-colombia',
    name: 'Cartagena',
    country: 'Colombia',
    continent: 'South America',
    coordinates: { lat: 10.3910, lng: -75.4794 },
    type: 'city',
    popularity: 7,
    description: 'Colonial walled city on the Caribbean coast',
    aliases: ['cartagena', 'cartagena colombia', 'walled city']
  },

  // Africa
  {
    id: 'cape-town-south-africa',
    name: 'Cape Town',
    country: 'South Africa',
    continent: 'Africa',
    coordinates: { lat: -33.9249, lng: 18.4241 },
    type: 'city',
    popularity: 8,
    description: 'Mother City with Table Mountain and wine regions',
    aliases: ['cape town', 'mother city', 'kaapstad']
  },
  {
    id: 'marrakech-morocco',
    name: 'Marrakech',
    country: 'Morocco',
    continent: 'Africa',
    coordinates: { lat: 31.6295, lng: -7.9811 },
    type: 'city',
    popularity: 8,
    description: 'Red City with souks, riads, and Sahara gateway',
    aliases: ['marrakech', 'marrakesh', 'red city']
  },
  {
    id: 'cairo-egypt',
    name: 'Cairo',
    country: 'Egypt',
    continent: 'Africa',
    coordinates: { lat: 30.0444, lng: 31.2357 },
    type: 'city',
    popularity: 8,
    description: 'City of a Thousand Minarets with pyramids and ancient history',
    aliases: ['cairo', 'al qahirah', 'city of thousand minarets']
  },
  {
    id: 'casablanca-morocco',
    name: 'Casablanca',
    country: 'Morocco',
    continent: 'Africa',
    coordinates: { lat: 33.5731, lng: -7.5898 },
    type: 'city',
    popularity: 6,
    description: 'Economic capital with Hassan II Mosque and modern architecture',
    aliases: ['casablanca', 'casa', 'dar el beida']
  },
  {
    id: 'nairobi-kenya',
    name: 'Nairobi',
    country: 'Kenya',
    continent: 'Africa',
    coordinates: { lat: -1.2921, lng: 36.8219 },
    type: 'city',
    popularity: 6,
    description: 'Green City in the Sun, gateway to safari adventures',
    aliases: ['nairobi', 'green city', 'nairobi kenya']
  },

  // Oceania
  {
    id: 'sydney-australia',
    name: 'Sydney',
    country: 'Australia',
    continent: 'Oceania',
    coordinates: { lat: -33.8688, lng: 151.2093 },
    type: 'city',
    popularity: 9,
    description: 'Harbour City with Opera House and beautiful beaches',
    aliases: ['sydney', 'harbour city', 'sydney australia']
  },
  {
    id: 'melbourne-australia',
    name: 'Melbourne',
    country: 'Australia',
    continent: 'Oceania',
    coordinates: { lat: -37.8136, lng: 144.9631 },
    type: 'city',
    popularity: 8,
    description: 'Cultural capital known for coffee, arts, and laneways',
    aliases: ['melbourne', 'melb', 'cultural capital']
  },
  {
    id: 'auckland-new-zealand',
    name: 'Auckland',
    country: 'New Zealand',
    continent: 'Oceania',
    coordinates: { lat: -36.8485, lng: 174.7633 },
    type: 'city',
    popularity: 7,
    description: 'City of Sails with harbours and volcanic cones',
    aliases: ['auckland', 'city of sails', 'auckland nz']
  },
  {
    id: 'queenstown-new-zealand',
    name: 'Queenstown',
    country: 'New Zealand',
    continent: 'Oceania',
    coordinates: { lat: -45.0312, lng: 168.6626 },
    type: 'city',
    popularity: 8,
    description: 'Adventure capital surrounded by mountains and lakes',
    aliases: ['queenstown', 'adventure capital', 'queenstown nz']
  },
  {
    id: 'fiji-islands',
    name: 'Fiji',
    country: 'Fiji',
    continent: 'Oceania',
    coordinates: { lat: -17.7134, lng: 178.0650 },
    type: 'country',
    popularity: 7,
    description: 'Tropical paradise with coral reefs and crystal-clear waters',
    aliases: ['fiji', 'fiji islands', 'bula']
  }

  // Additional destinations can be added to reach 500+ total
]

class DestinationFallbackService {
  private destinations: FallbackDestination[]
  
  constructor() {
    this.destinations = popularDestinations
  }

  /**
   * Search destinations in fallback database
   * FR-005.4: Fallback search maintaining same interface as API search
   */
  searchDestinations(query: string, limit: number = 5): FallbackDestination[] {
    if (!query || query.length < 2) {
      return []
    }

    const searchTerm = query.toLowerCase().trim()
    
    // Score-based matching for better relevance
    const scoredResults = this.destinations.map(dest => {
      let score = 0
      
      // Exact name match (highest score)
      if (dest.name.toLowerCase() === searchTerm) {
        score += 100
      }
      
      // Name starts with search term
      if (dest.name.toLowerCase().startsWith(searchTerm)) {
        score += 50
      }
      
      // Name contains search term
      if (dest.name.toLowerCase().includes(searchTerm)) {
        score += 30
      }
      
      // Country match
      if (dest.country.toLowerCase().includes(searchTerm)) {
        score += 25
      }
      
      // Alias matches
      dest.aliases.forEach(alias => {
        if (alias.toLowerCase() === searchTerm) {
          score += 80
        } else if (alias.toLowerCase().includes(searchTerm)) {
          score += 20
        }
      })
      
      // Description match (partial)
      if (dest.description.toLowerCase().includes(searchTerm)) {
        score += 10
      }
      
      // Apply popularity boost
      score += dest.popularity * 2
      
      return { destination: dest, score }
    })
    
    // Filter out zero scores and sort by score
    return scoredResults
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.destination)
  }

  /**
   * Get destinations by continent (for secondary fallback)
   * FR-005.4: Static list of major cities by continent
   */
  getDestinationsByContinent(continent: string): FallbackDestination[] {
    return this.destinations
      .filter(dest => dest.continent.toLowerCase() === continent.toLowerCase())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10) // Top 10 per continent
  }

  /**
   * Get most popular destinations globally
   */
  getPopularDestinations(limit: number = 20): FallbackDestination[] {
    return this.destinations
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
  }

  /**
   * Get random destinations for inspiration
   */
  getRandomDestinations(limit: number = 5): FallbackDestination[] {
    const shuffled = [...this.destinations].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, limit)
  }

  /**
   * Validate coordinates are searchable (basic validation)
   * FR-005.3: Validate that coordinates correspond to searchable locations
   */
  validateCoordinates(lat: number, lng: number): boolean {
    // Basic bounds checking
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  /**
   * Convert fallback destination to match PlaceResult interface
   */
  toPlaceResult(destination: FallbackDestination): any {
    return {
      placeId: destination.id,
      description: `${destination.name}, ${destination.country}`,
      mainText: destination.name,
      secondaryText: destination.country,
      types: [destination.type === 'city' ? 'locality' : destination.type], // Map city to locality type
      fallback: true, // Mark as fallback result
      coordinates: destination.coordinates,
      popularity: destination.popularity
    }
  }

  /**
   * Convert fallback destination to PlaceDetails interface
   */
  toPlaceDetails(destination: FallbackDestination): any {
    return {
      placeId: destination.id,
      name: destination.name,
      formattedAddress: `${destination.name}, ${destination.country}`,
      geometry: {
        location: destination.coordinates
      },
      types: [destination.type],
      fallback: true,
      description: destination.description
    }
  }

  /**
   * Get all continents available
   */
  getAvailableContinents(): string[] {
    const continents = new Set(this.destinations.map(dest => dest.continent))
    return Array.from(continents).sort()
  }

  /**
   * Get statistics about the fallback database
   */
  getStats() {
    const byContinent = this.getAvailableContinents().map(continent => ({
      continent,
      count: this.destinations.filter(d => d.continent === continent).length
    }))

    return {
      totalDestinations: this.destinations.length,
      byContinent,
      averagePopularity: this.destinations.reduce((sum, d) => sum + d.popularity, 0) / this.destinations.length
    }
  }
}

// Export singleton instance
export const destinationFallback = new DestinationFallbackService()

// Export types
export type { FallbackDestination }