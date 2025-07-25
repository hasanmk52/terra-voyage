import { format, addDays } from "date-fns";
import { useMocks, mockFlights, simulateDelay } from "./mock-data";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  maxResults?: number;
}

export interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
    base: string;
    fees: Array<{
      amount: string;
      type: string;
    }>;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        terminal?: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      operating?: {
        carrierCode: string;
      };
      duration: string;
      stops: number;
    }>;
  }>;
  price_last_updated: string;
  bookingUrl?: string;
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType:
      | "ADULT"
      | "CHILD"
      | "SENIOR"
      | "YOUNG"
      | "HELD_INFANT"
      | "SEATED_INFANT"
      | "STUDENT";
    price: {
      currency: string;
      total: string;
      base: string;
    };
  }>;
}

export interface AirportInfo {
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

export interface FlightSearchResponse {
  data: FlightOffer[];
  meta: {
    count: number;
    links?: {
      self: string;
      next?: string;
      previous?: string;
      last?: string;
      first?: string;
    };
  };
  dictionaries?: {
    locations: Record<string, AirportInfo>;
    aircraft: Record<string, string>;
    carriers: Record<string, string>;
    currencies: Record<string, string>;
  };
}

export class AmadeusClient {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || "";
    this.apiSecret = process.env.AMADEUS_API_SECRET || "";
  }

  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    adults: number;
  }) {
    if (useMocks) {
      await simulateDelay("flights");
      return {
        data: mockFlights.map((flight) => ({
          ...flight,
          // Customize mock data based on search params
          itineraries: flight.itineraries.map((itinerary) => ({
            ...itinerary,
            segments: itinerary.segments.map((segment) => ({
              ...segment,
              departure: {
                ...segment.departure,
                iataCode: params.origin,
              },
              arrival: {
                ...segment.arrival,
                iataCode: params.destination,
              },
            })),
          })),
        })),
      };
    }

    // Real API implementation here
    const response = await fetch(
      "https://api.amadeus.com/v2/shopping/flight-offers",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      }
    );

    return response.json();
  }

  async searchAirports(query: string) {
    if (useMocks) {
      await simulateDelay("flights");
      return {
        data: [
          {
            iataCode: "JFK",
            name: "John F. Kennedy International Airport",
            city: "New York",
            country: "United States",
          },
          {
            iataCode: "LAX",
            name: "Los Angeles International Airport",
            city: "Los Angeles",
            country: "United States",
          },
          {
            iataCode: "SFO",
            name: "San Francisco International Airport",
            city: "San Francisco",
            country: "United States",
          },
        ].filter(
          (airport) =>
            airport.name.toLowerCase().includes(query.toLowerCase()) ||
            airport.city.toLowerCase().includes(query.toLowerCase()) ||
            airport.iataCode.toLowerCase().includes(query.toLowerCase())
        ),
      };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.amadeus.com/v1/reference-data/locations?keyword=${query}&subType=AIRPORT`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json();
  }
}

// Singleton instance
export const amadeusClient = new AmadeusClient();

// Mock data for development/testing when API is not configured
export const mockFlightData: FlightSearchResponse = {
  data: [
    {
      id: "mock-flight-1",
      price: {
        total: "299.99",
        currency: "USD",
        base: "250.00",
        fees: [{ amount: "49.99", type: "SUPPLIER" }],
      },
      itineraries: [
        {
          duration: "PT5H30M",
          segments: [
            {
              departure: {
                iataCode: "JFK",
                at: "2024-03-15T08:00:00",
              },
              arrival: {
                iataCode: "LAX",
                at: "2024-03-15T11:30:00",
              },
              carrierCode: "AA",
              number: "123",
              aircraft: { code: "738" },
              duration: "PT5H30M",
              stops: 0,
            },
          ],
        },
      ],
      price_last_updated: new Date().toISOString(),
      bookingUrl: "/api/booking/flight-redirect?mock=true",
      validatingAirlineCodes: ["AA"],
      travelerPricings: [
        {
          travelerId: "1",
          fareOption: "STANDARD",
          travelerType: "ADULT",
          price: {
            currency: "USD",
            total: "299.99",
            base: "250.00",
          },
        },
      ],
    },
  ],
  meta: {
    count: 1,
  },
  dictionaries: {
    locations: {
      JFK: {
        iataCode: "JFK",
        name: "John F Kennedy International Airport",
        city: "New York",
        country: "United States",
      },
      LAX: {
        iataCode: "LAX",
        name: "Los Angeles International Airport",
        city: "Los Angeles",
        country: "United States",
      },
    },
    carriers: {
      AA: "American Airlines",
    },
    aircraft: {
      "738": "Boeing 737-800",
    },
    currencies: {
      USD: "US Dollar",
    },
  },
};
