import { useMocks, mockHotels, simulateDelay } from "./mock-data";

export class BookingClient {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.BOOKING_API_KEY || "";
  }

  async searchHotels(params: {
    city: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }) {
    if (useMocks) {
      await simulateDelay("hotels");
      return {
        data: mockHotels.map((hotel) => ({
          ...hotel,
          price: {
            ...hotel.price,
            // Adjust price based on number of nights
            total:
              hotel.price.perNight *
              this.calculateNights(params.checkIn, params.checkOut),
          },
        })),
      };
    }

    // Real API implementation here
    const response = await fetch("https://api.booking.com/v1/hotels/search", {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    return response.json();
  }

  async getHotelDetails(hotelId: string) {
    if (useMocks) {
      await simulateDelay("hotels");
      const hotel = mockHotels.find((h) => h.id === hotelId);
      return hotel ? { data: hotel } : { error: "Hotel not found" };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.booking.com/v1/hotels/${hotelId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json();
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Export types
export interface HotelSearchParams {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

// Export singleton instance
export const bookingClient = new BookingClient();
