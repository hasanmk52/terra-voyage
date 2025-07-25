import { type } from "os";

export const useMocks = process.env.USE_MOCKS === "true" || process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// Types for mock data
interface MockFlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
    base: string;
    fees: any[];
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        terminal: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        terminal: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
    }>;
  }>;
  validatingAirlineCodes: string[];
}

interface MockHotel {
  id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  rating: {
    stars: number;
    score: number;
    reviewCount: number;
  };
  amenities: string[];
  images: string[];
  price: {
    perNight: number;
    total: number;
    currency: string;
    taxesAndFees: number;
  };
}

interface MockWeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
  };
  forecast: Array<{
    date: string;
    temp: {
      min: number;
      max: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    precipitation: number;
  }>;
}

interface MockMapFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    title: string;
    description: string;
    [key: string]: any;
  };
}

// Mock data for flight offers
export const mockFlights: MockFlightOffer[] = [
  {
    id: "mock-flight-1",
    price: {
      total: "500.00",
      currency: "USD",
      base: "450.00",
      fees: [],
    },
    itineraries: [
      {
        duration: "2h 30m",
        segments: [
          {
            departure: {
              iataCode: "JFK",
              terminal: "4",
              at: "2024-04-01T10:00:00",
            },
            arrival: {
              iataCode: "LAX",
              terminal: "5",
              at: "2024-04-01T12:30:00",
            },
            carrierCode: "MOCK",
            number: "MK123",
            aircraft: { code: "789" },
          },
        ],
      },
    ],
    validatingAirlineCodes: ["MOCK"],
  },
  {
    id: "mock-flight-2",
    price: {
      total: "750.00",
      currency: "USD",
      base: "680.00",
      fees: [],
    },
    itineraries: [
      {
        duration: "5h 45m",
        segments: [
          {
            departure: {
              iataCode: "SFO",
              terminal: "2",
              at: "2024-04-01T08:00:00",
            },
            arrival: {
              iataCode: "JFK",
              terminal: "4",
              at: "2024-04-01T13:45:00",
            },
            carrierCode: "MOCK",
            number: "MK456",
            aircraft: { code: "777" },
          },
        ],
      },
    ],
    validatingAirlineCodes: ["MOCK"],
  },
];

// Mock data for hotels
export const mockHotels: MockHotel[] = [
  {
    id: "mock-hotel-1",
    name: "Grand Mock Hotel & Spa",
    description: "Luxurious mock hotel in the heart of the city",
    address: {
      street: "123 Mock Street",
      city: "New York",
      country: "USA",
      postalCode: "10001",
    },
    location: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    rating: {
      stars: 4.5,
      score: 9.2,
      reviewCount: 1250,
    },
    amenities: ["Pool", "Spa", "Restaurant", "Free WiFi"],
    images: [
      "https://example.com/mock-hotel-1.jpg",
      "https://example.com/mock-hotel-2.jpg",
    ],
    price: {
      perNight: 299.99,
      total: 899.97,
      currency: "USD",
      taxesAndFees: 100,
    },
  },
  {
    id: "mock-hotel-2",
    name: "Budget Mock Inn",
    description: "Comfortable and affordable accommodation",
    address: {
      street: "456 Mock Avenue",
      city: "Los Angeles",
      country: "USA",
      postalCode: "90001",
    },
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
    },
    rating: {
      stars: 3.5,
      score: 8.1,
      reviewCount: 850,
    },
    amenities: ["Free WiFi", "Parking", "Breakfast"],
    images: [
      "https://example.com/mock-hotel-3.jpg",
      "https://example.com/mock-hotel-4.jpg",
    ],
    price: {
      perNight: 129.99,
      total: 389.97,
      currency: "USD",
      taxesAndFees: 50,
    },
  },
];

// Mock data for weather
export const mockWeather: MockWeatherData = {
  current: {
    temp: 22,
    feels_like: 23,
    humidity: 65,
    wind_speed: 5.2,
    weather: [
      {
        main: "Clear",
        description: "clear sky",
        icon: "01d",
      },
    ],
  },
  forecast: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() + i * 86400000).toISOString(),
    temp: {
      min: 18 + i,
      max: 25 + i,
    },
    weather: [
      {
        main: "Clear",
        description: "clear sky",
        icon: "01d",
      },
    ],
    precipitation: 0,
  })),
};

// Mock data for maps
export const mockMapFeatures: MockMapFeature[] = [
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [-74.006, 40.7128],
    },
    properties: {
      title: "Mock Location 1",
      description: "A wonderful mock tourist attraction",
      type: "attraction",
      rating: 4.5,
    },
  },
  {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [-118.2437, 34.0522],
    },
    properties: {
      title: "Mock Location 2",
      description: "Another fantastic mock destination",
      type: "restaurant",
      rating: 4.8,
    },
  },
];

// Mock delays (in milliseconds)
export const mockDelays = {
  flights: 800,
  hotels: 600,
  weather: 400,
  maps: 200,
  email: 100,
  ai: 1200,
  database: 150,
  websocket: 200,
  pdf: 2000,
  calendar: 400,
  booking: 500,
  notifications: 250,
};

// Helper function to simulate API delay
export const simulateDelay = async (
  type: keyof typeof mockDelays
): Promise<void> => {
  if (!useMocks) return;
  await new Promise((resolve) => setTimeout(resolve, mockDelays[type]));
};

// In-memory cache for price history
export const mockPriceCache = new Map<string, any>();

// Mock email queue
export const mockEmailQueue: Array<{
  to: string;
  subject: string;
  body: string;
  sentAt: Date;
}> = [];

// Mock data for Google Places API
export interface MockPlaceResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface MockPlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  website?: string;
  formattedPhoneNumber?: string;
}

// Mock destination data for autocomplete
export const mockDestinations: MockPlaceResult[] = [
  {
    placeId: "mock-place-1",
    description: "Paris, France",
    mainText: "Paris",
    secondaryText: "France",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-2", 
    description: "Tokyo, Japan",
    mainText: "Tokyo",
    secondaryText: "Japan",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-3",
    description: "New York, NY, USA", 
    mainText: "New York",
    secondaryText: "NY, USA",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-4",
    description: "London, UK",
    mainText: "London", 
    secondaryText: "UK",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-5",
    description: "Rome, Italy",
    mainText: "Rome",
    secondaryText: "Italy", 
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-6",
    description: "Barcelona, Spain",
    mainText: "Barcelona",
    secondaryText: "Spain",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-7",
    description: "Amsterdam, Netherlands",
    mainText: "Amsterdam",
    secondaryText: "Netherlands",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-8",
    description: "Berlin, Germany",
    mainText: "Berlin",
    secondaryText: "Germany",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-9",
    description: "Sydney, Australia",
    mainText: "Sydney",
    secondaryText: "Australia", 
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-10",
    description: "Bangkok, Thailand",
    mainText: "Bangkok",
    secondaryText: "Thailand",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-11",
    description: "Dubai, United Arab Emirates",
    mainText: "Dubai",
    secondaryText: "United Arab Emirates",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-12",
    description: "Mumbai, Maharashtra, India",
    mainText: "Mumbai",
    secondaryText: "Maharashtra, India",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-13",
    description: "Singapore",
    mainText: "Singapore",
    secondaryText: "Singapore",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-14",
    description: "Delhi, India",
    mainText: "Delhi",
    secondaryText: "India",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-15",
    description: "Hong Kong",
    mainText: "Hong Kong",
    secondaryText: "Hong Kong",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-16",
    description: "Bali, Indonesia",
    mainText: "Bali",
    secondaryText: "Indonesia",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-17",
    description: "Istanbul, Turkey",
    mainText: "Istanbul",
    secondaryText: "Turkey",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-18",
    description: "Maldives",
    mainText: "Maldives",
    secondaryText: "Maldives",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-19",
    description: "Cape Town, South Africa",
    mainText: "Cape Town",
    secondaryText: "South Africa",
    types: ["locality", "political"]
  },
  {
    placeId: "mock-place-20",
    description: "Santorini, Greece",
    mainText: "Santorini",
    secondaryText: "Greece",
    types: ["locality", "political"]
  }
];

// Mock place details
export const mockPlaceDetails: Record<string, MockPlaceDetails> = {
  "mock-place-1": {
    placeId: "mock-place-1",
    name: "Paris",
    formattedAddress: "Paris, France",
    geometry: {
      location: { lat: 48.8566, lng: 2.3522 }
    },
    types: ["locality", "political"],
    rating: 4.8
  },
  "mock-place-2": {
    placeId: "mock-place-2", 
    name: "Tokyo",
    formattedAddress: "Tokyo, Japan",
    geometry: {
      location: { lat: 35.6762, lng: 139.6503 }
    },
    types: ["locality", "political"],
    rating: 4.7
  },
  "mock-place-3": {
    placeId: "mock-place-3",
    name: "New York",
    formattedAddress: "New York, NY, USA",
    geometry: {
      location: { lat: 40.7128, lng: -74.0060 }
    },
    types: ["locality", "political"],
    rating: 4.6
  },
  "mock-place-4": {
    placeId: "mock-place-4",
    name: "London",
    formattedAddress: "London, UK", 
    geometry: {
      location: { lat: 51.5074, lng: -0.1278 }
    },
    types: ["locality", "political"],
    rating: 4.5
  },
  "mock-place-5": {
    placeId: "mock-place-5",
    name: "Rome",
    formattedAddress: "Rome, Italy",
    geometry: {
      location: { lat: 41.9028, lng: 12.4964 }
    },
    types: ["locality", "political"], 
    rating: 4.7
  },
  "mock-place-11": {
    placeId: "mock-place-11",
    name: "Dubai",
    formattedAddress: "Dubai, United Arab Emirates",
    geometry: {
      location: { lat: 25.2048, lng: 55.2708 }
    },
    types: ["locality", "political"],
    rating: 4.8
  },
  "mock-place-12": {
    placeId: "mock-place-12",
    name: "Mumbai",
    formattedAddress: "Mumbai, Maharashtra, India",
    geometry: {
      location: { lat: 19.0760, lng: 72.8777 }
    },
    types: ["locality", "political"],
    rating: 4.3
  },
  "mock-place-13": {
    placeId: "mock-place-13",
    name: "Singapore",
    formattedAddress: "Singapore",
    geometry: {
      location: { lat: 1.3521, lng: 103.8198 }
    },
    types: ["locality", "political"],
    rating: 4.7
  },
  "mock-place-14": {
    placeId: "mock-place-14",
    name: "Delhi",
    formattedAddress: "Delhi, India",
    geometry: {
      location: { lat: 28.7041, lng: 77.1025 }
    },
    types: ["locality", "political"],
    rating: 4.2
  },
  "mock-place-15": {
    placeId: "mock-place-15",
    name: "Hong Kong",
    formattedAddress: "Hong Kong",
    geometry: {
      location: { lat: 22.3193, lng: 114.1694 }
    },
    types: ["locality", "political"],
    rating: 4.6
  },
  "mock-place-16": {
    placeId: "mock-place-16",
    name: "Bali",
    formattedAddress: "Bali, Indonesia",
    geometry: {
      location: { lat: -8.3405, lng: 115.0920 }
    },
    types: ["locality", "political"],
    rating: 4.9
  },
  "mock-place-17": {
    placeId: "mock-place-17",
    name: "Istanbul",
    formattedAddress: "Istanbul, Turkey",
    geometry: {
      location: { lat: 41.0082, lng: 28.9784 }
    },
    types: ["locality", "political"],
    rating: 4.5
  },
  "mock-place-18": {
    placeId: "mock-place-18",
    name: "Maldives",
    formattedAddress: "Maldives",
    geometry: {
      location: { lat: 3.2028, lng: 73.2207 }
    },
    types: ["locality", "political"],
    rating: 4.9
  },
  "mock-place-19": {
    placeId: "mock-place-19",
    name: "Cape Town",
    formattedAddress: "Cape Town, South Africa",
    geometry: {
      location: { lat: -33.9249, lng: 18.4241 }
    },
    types: ["locality", "political"],
    rating: 4.6
  },
  "mock-place-20": {
    placeId: "mock-place-20",
    name: "Santorini",
    formattedAddress: "Santorini, Greece",
    geometry: {
      location: { lat: 36.3932, lng: 25.4615 }
    },
    types: ["locality", "political"],
    rating: 4.8
  }
};
