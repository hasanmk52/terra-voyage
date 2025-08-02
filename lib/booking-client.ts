
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
    if (!this.apiKey) {
      throw new Error('Booking API key not configured. Please set BOOKING_API_KEY environment variable.');
    }

    const response = await fetch("https://api.booking.com/v1/hotels/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Booking API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getHotelDetails(hotelId: string) {
    if (!this.apiKey) {
      throw new Error('Booking API key not configured. Please set BOOKING_API_KEY environment variable.');
    }

    const response = await fetch(
      `https://api.booking.com/v1/hotels/${hotelId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Booking API error: ${response.status} ${response.statusText}`);
    }

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
