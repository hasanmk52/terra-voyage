import { useMocks, mockMapFeatures, simulateDelay } from "./mock-data";

export const MAPBOX_CONFIG = {
  ACCESS_TOKEN: useMocks
    ? "mock-mapbox-token"
    : process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
  STYLE_URL: "mapbox://styles/mapbox/streets-v11",
  DEFAULT_CENTER: [-74.006, 40.7128], // New York City
  DEFAULT_ZOOM: 12,
};

export class MapboxService {
  async getLocations(query: string) {
    if (useMocks) {
      await simulateDelay("maps");
      return {
        features: mockMapFeatures.filter(
          (feature) =>
            feature.properties.title
              .toLowerCase()
              .includes(query.toLowerCase()) ||
            feature.properties.description
              .toLowerCase()
              .includes(query.toLowerCase())
        ),
      };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}`
    );

    return response.json();
  }

  async getDirections(
    origin: [number, number],
    destination: [number, number],
    mode: "driving" | "walking" | "cycling" = "driving"
  ) {
    if (useMocks) {
      await simulateDelay("maps");
      return {
        routes: [
          {
            distance: 5000, // meters
            duration: 1200, // seconds
            geometry: {
              coordinates: [origin, destination],
              type: "LineString",
            },
          },
        ],
      };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${mode}/${origin.join(
        ","
      )};${destination.join(",")}?access_token=${MAPBOX_CONFIG.ACCESS_TOKEN}`
    );

    return response.json();
  }
}
