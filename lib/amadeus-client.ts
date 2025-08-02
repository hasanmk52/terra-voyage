import { format, addDays } from "date-fns";

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
    if (!this.apiKey) {
      throw new Error('Amadeus API key not configured. Please set AMADEUS_API_KEY environment variable.');
    }

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

    if (!response.ok) {
      throw new Error(`Amadeus API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchAirports(query: string) {
    if (!this.apiKey) {
      throw new Error('Amadeus API key not configured. Please set AMADEUS_API_KEY environment variable.');
    }

    const response = await fetch(
      `https://api.amadeus.com/v1/reference-data/locations?keyword=${query}&subType=AIRPORT`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Amadeus API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const amadeusClient = new AmadeusClient();
