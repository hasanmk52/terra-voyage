import {
  currentWeatherSchema,
  forecastResponseSchema,
  type CurrentWeather,
  type ForecastResponse,
  type ProcessedWeather,
  type WeatherForecast,
  kelvinToCelsius,
  mpsToKmh,
  getWindDirection,
  getWeatherSeverity,
} from "./weather-types";
import { useMockWeather } from "./selective-mocks";
import { mockWeather, simulateDelay } from "./mock-data";
import { circuitBreakers } from "./circuit-breaker";
import { retryManagers } from "./retry-logic";

export class WeatherAPI {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || "";
  }

  async getCurrentWeather(location: { lat: number; lon: number }) {
    // Validate coordinates first
    if (typeof location.lat !== 'number' || typeof location.lon !== 'number' ||
        location.lat < -90 || location.lat > 90 ||
        location.lon < -180 || location.lon > 180 ||
        !isFinite(location.lat) || !isFinite(location.lon)) {
      throw new Error("Invalid coordinates provided");
    }

    // Use circuit breaker with fallback to mock data
    return circuitBreakers.weather.execute(
      async () => {
        if (useMockWeather) {
          await simulateDelay("weather");
          return mockWeather.current;
        }

        if (!this.apiKey) {
          throw new Error("Weather API key is required. Please set WEATHER_API_KEY in your environment variables.");
        }

        // Execute with retry logic
        return retryManagers.weather.execute(async () => {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${encodeURIComponent(this.apiKey)}&units=metric`,
            {
              headers: {
                'User-Agent': 'TerraVoyage/1.0',
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Weather API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
      
          // Validate response structure
          if (!data || !data.main || !data.weather || !data.weather[0]) {
            console.warn("Invalid weather data structure, using fallback");
            throw new Error("Invalid weather data structure");
          }

          return data;
        });
      },
      async () => {
        // Fallback to mock data
        console.log("Using weather mock data as fallback");
        await simulateDelay("weather");
        return mockWeather.current;
      }
    );
  }

  async getWeatherForecast(location: { lat: number; lon: number }) {
    // Validate coordinates first
    if (typeof location.lat !== 'number' || typeof location.lon !== 'number' ||
        location.lat < -90 || location.lat > 90 ||
        location.lon < -180 || location.lon > 180 ||
        !isFinite(location.lat) || !isFinite(location.lon)) {
      throw new Error("Invalid coordinates provided");
    }

    // Use circuit breaker with fallback to mock data
    return circuitBreakers.weather.execute(
      async () => {
        if (useMockWeather) {
          await simulateDelay("weather");
          return mockWeather.forecast;
        }

        if (!this.apiKey) {
          throw new Error("Weather API key is required. Please set WEATHER_API_KEY in your environment variables.");
        }

        // Execute with retry logic
        return retryManagers.weather.execute(async () => {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${encodeURIComponent(this.apiKey)}&units=metric`,
            {
              headers: {
                'User-Agent': 'TerraVoyage/1.0',
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Weather API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          
          // Validate response structure
          if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
            console.warn("Invalid forecast data structure, using fallback");
            throw new Error("Invalid forecast data structure");
          }

          return data;
        });
      },
      async () => {
        // Fallback to mock data
        console.log("Using weather forecast mock data as fallback");
        await simulateDelay("weather");
        return mockWeather.forecast;
      }
    );
  }

  async getWeatherAlerts(location: { lat: number; lon: number }) {
    // Validate coordinates first
    if (typeof location.lat !== 'number' || typeof location.lon !== 'number' ||
        location.lat < -90 || location.lat > 90 ||
        location.lon < -180 || location.lon > 180 ||
        !isFinite(location.lat) || !isFinite(location.lon)) {
      throw new Error("Invalid coordinates provided");
    }

    // Use circuit breaker with fallback to mock data
    return circuitBreakers.weather.execute(
      async () => {
        if (useMockWeather) {
          await simulateDelay("weather");
          return {
            alerts: [], // No alerts in mock data by default
          };
        }

        if (!this.apiKey) {
          throw new Error("Weather API key is required. Please set WEATHER_API_KEY in your environment variables.");
        }

        // Execute with retry logic
        return retryManagers.weather.execute(async () => {
          // Note: OneCall API 3.0 requires subscription, using basic API for alerts
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${encodeURIComponent(this.apiKey)}&units=metric`,
            {
              headers: {
                'User-Agent': 'TerraVoyage/1.0',
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Weather API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          // Extract any weather alerts from the basic API response
          return {
            alerts: data.alerts || [],
          };
        });
      },
      async () => {
        // Fallback to mock data
        console.log("Using weather alerts mock data as fallback");
        await simulateDelay("weather");
        return {
          alerts: [],
        };
      }
    );
  }
}

// Data processing functions
export function processCurrentWeather(
  weather: CurrentWeather
): ProcessedWeather {
  // Validate required data structure - return null if invalid
  if (!weather || !weather.weather || !weather.weather[0] || !weather.main) {
    console.warn("Invalid weather data structure, cannot process");
    return null as any; // This will be caught by the calling function
  }

  const condition = weather.weather[0];
  const temp = Math.round(weather.main.temp); // Already in Celsius due to units=metric
  const windSpeed = weather.wind ? mpsToKmh(weather.wind.speed) : 0;
  const precipitation = weather.rain?.["1h"] || weather.snow?.["1h"] || 0;

  return {
    date: new Date(weather.dt * 1000).toISOString().split("T")[0],
    temperature: {
      current: temp,
      min: Math.round(weather.main.temp_min || weather.main.temp),
      max: Math.round(weather.main.temp_max || weather.main.temp),
      feelsLike: Math.round(weather.main.feels_like || weather.main.temp),
    },
    condition: {
      main: condition.main || "Unknown",
      description: condition.description || "Unknown weather",
      icon: condition.icon || "01d",
      severity: getWeatherSeverity(
        condition.description || "clear",
        temp,
        windSpeed,
        precipitation
      ),
    },
    precipitation: {
      probability: 0, // Not available in current weather
      amount: precipitation,
      type: weather.rain ? "rain" : weather.snow ? "snow" : "none",
    },
    wind: {
      speed: windSpeed,
      direction: weather.wind ? getWindDirection(weather.wind.deg || 0) : "N",
      gust: weather.wind?.gust ? mpsToKmh(weather.wind.gust) : undefined,
    },
    humidity: weather.main.humidity || 50,
    visibility: weather.visibility ? weather.visibility / 1000 : 10, // Convert to km
    sunrise: weather.sys?.sunrise ? new Date(weather.sys.sunrise * 1000).toTimeString().slice(0, 5) : "06:00",
    sunset: weather.sys?.sunset ? new Date(weather.sys.sunset * 1000).toTimeString().slice(0, 5) : "18:00",
    isExtreme:
      getWeatherSeverity(
        condition.description || "clear",
        temp,
        windSpeed,
        precipitation
      ) === "severe",
  };
}

export function processForecastData(
  forecast: ForecastResponse
): ProcessedWeather[] {
  // Validate forecast data structure
  if (!forecast || !forecast.list || !Array.isArray(forecast.list)) {
    console.warn("Invalid forecast data structure, cannot process");
    return [] as any; // This will be caught by the calling function
  }

  // Group forecast items by date and get daily summaries
  const dailyData = new Map<string, any[]>();

  forecast.list.forEach((item) => {
    // Skip items with invalid structure
    if (!item || !item.dt || !item.main || !item.weather || !item.weather[0]) {
      return;
    }
    
    const date = new Date(item.dt * 1000).toISOString().split("T")[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, []);
    }
    dailyData.get(date)!.push(item);
  });

  const processedDays: ProcessedWeather[] = [];

  for (const [date, items] of Array.from(dailyData.entries())) {
    if (items.length === 0) continue;

    // Calculate daily aggregates (temperatures already in Celsius due to units=metric)
    const temps = items.map((item) => item.main.temp);
    const minTemp = Math.min(...items.map((item) => item.main.temp_min));
    const maxTemp = Math.max(...items.map((item) => item.main.temp_max));
    const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
    const feelsLike =
      items.reduce((sum, item) => sum + item.main.feels_like, 0) / items.length;

    // Get most significant weather condition
    const conditions = items.map((item) => item.weather[0]);
    const dominantCondition = conditions.reduce((prev, current) => {
      const prevSeverity = getWeatherSeverity(prev.description, avgTemp, 0, 0);
      const currentSeverity = getWeatherSeverity(
        current.description,
        avgTemp,
        0,
        0
      );
      if (currentSeverity === "severe" && prevSeverity !== "severe")
        return current;
      if (currentSeverity === "moderate" && prevSeverity === "mild")
        return current;
      return prev;
    });

    // Calculate precipitation
    const precipitationAmounts = items.map(
      (item) => item.rain?.["3h"] || item.snow?.["3h"] || 0
    );
    const totalPrecipitation = precipitationAmounts.reduce(
      (sum, amount) => sum + amount,
      0
    );
    const maxPop = Math.max(...items.map((item) => item.pop || 0));

    // Wind data
    const windSpeeds = items
      .filter((item) => item.wind)
      .map((item) => mpsToKmh(item.wind!.speed));
    const avgWindSpeed =
      windSpeeds.length > 0
        ? windSpeeds.reduce((sum, speed) => sum + speed, 0) / windSpeeds.length
        : 0;
    const windDirections = items
      .filter((item) => item.wind)
      .map((item) => item.wind!.deg);
    const avgWindDirection =
      windDirections.length > 0
        ? windDirections.reduce((sum, deg) => sum + deg, 0) /
          windDirections.length
        : 0;

    // Humidity
    const avgHumidity =
      items.reduce((sum, item) => sum + item.main.humidity, 0) / items.length;

    // Visibility
    const visibilities = items
      .filter((item) => item.visibility)
      .map((item) => item.visibility! / 1000);
    const avgVisibility =
      visibilities.length > 0
        ? visibilities.reduce((sum, vis) => sum + vis, 0) / visibilities.length
        : 10;

    processedDays.push({
      date,
      temperature: {
        current: Math.round(avgTemp),
        min: minTemp,
        max: maxTemp,
        feelsLike: Math.round(feelsLike),
      },
      condition: {
        main: dominantCondition.main,
        description: dominantCondition.description,
        icon: dominantCondition.icon,
        severity: getWeatherSeverity(
          dominantCondition.description,
          avgTemp,
          avgWindSpeed,
          totalPrecipitation
        ),
      },
      precipitation: {
        probability: Math.round(maxPop * 100),
        amount: Math.round(totalPrecipitation * 10) / 10,
        type: items.some((item) => item.rain)
          ? "rain"
          : items.some((item) => item.snow)
          ? "snow"
          : "none",
      },
      wind: {
        speed: Math.round(avgWindSpeed),
        direction: getWindDirection(avgWindDirection),
        gust:
          Math.max(
            ...items
              .filter((item) => item.wind?.gust)
              .map((item) => mpsToKmh(item.wind!.gust!)),
            0
          ) || undefined,
      },
      humidity: Math.round(avgHumidity),
      visibility: Math.round(avgVisibility * 10) / 10,
      sunrise: new Date(forecast.city.sunrise * 1000)
        .toTimeString()
        .slice(0, 5),
      sunset: new Date(forecast.city.sunset * 1000).toTimeString().slice(0, 5),
      isExtreme:
        getWeatherSeverity(
          dominantCondition.description,
          avgTemp,
          avgWindSpeed,
          totalPrecipitation
        ) === "severe",
    });
  }

  // Sort by date and return up to 10 days
  return processedDays
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);
}

// Create WeatherAPI instance
const weatherAPI = new WeatherAPI();

// Cache for weather data
const weatherCache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Helper functions to use the WeatherAPI class
export async function fetchCurrentWeather(lat: number, lng: number) {
  const cacheKey = `current_${lat}_${lng}`;
  const cached = weatherCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const data = await weatherAPI.getCurrentWeather({ lat, lon: lng });
  weatherCache.set(cacheKey, { data, expiry: Date.now() + CACHE_DURATION });
  return data;
}

export async function fetchWeatherForecast(lat: number, lng: number) {
  const cacheKey = `forecast_${lat}_${lng}`;
  const cached = weatherCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const data = await weatherAPI.getWeatherForecast({ lat, lon: lng });
  weatherCache.set(cacheKey, { data, expiry: Date.now() + CACHE_DURATION });
  return data;
}

// Main function to get complete weather forecast
export async function getWeatherForecast(
  lat: number,
  lng: number,
  locationName?: string
): Promise<WeatherForecast> {
  try {
    const [currentWeather, forecastData] = await Promise.all([
      fetchCurrentWeather(lat, lng),
      fetchWeatherForecast(lat, lng),
    ]);

    let current: ProcessedWeather;
    let forecast: ProcessedWeather[];

    try {
      current = processCurrentWeather(currentWeather);
      // Check if processing returned null due to invalid data
      if (!current) {
        console.warn("Current weather processing returned null, using mock data");
        current = processCurrentWeather(mockWeather.current as any);
      }
    } catch (error) {
      console.error("Failed to process current weather, using fallback:", error);
      // Use mock data if processing fails
      current = processCurrentWeather(mockWeather.current as any);
    }

    try {
      forecast = processForecastData(forecastData);
      // Check if processing returned empty array due to invalid data
      if (!forecast || forecast.length === 0) {
        console.warn("Forecast processing returned empty, using mock data");
        forecast = processForecastData(mockWeather.forecast as any);
      }
    } catch (error) {
      console.error("Failed to process forecast data, using fallback:", error);
      // Use mock data if processing fails
      forecast = processForecastData(mockWeather.forecast as any);
    }

    return {
      location: {
        name: locationName || currentWeather?.name || "Unknown Location",
        country: currentWeather?.sys?.country || "Unknown",
        coordinates: { lat, lng },
      },
      current,
      forecast,
      lastUpdated: new Date().toISOString(),
      source: currentWeather === mockWeather.current ? "mock" : "openweathermap",
    };
  } catch (error) {
    console.error("Error getting weather forecast:", error);
    throw error;
  }
}

// Utility function to get weather for multiple locations
export async function getWeatherForLocations(
  locations: Array<{ lat: number; lng: number; name?: string }>
): Promise<WeatherForecast[]> {
  const promises = locations.map((location) =>
    getWeatherForecast(location.lat, location.lng, location.name).catch(
      (error) => {
        console.error(`Failed to get weather for ${location.name}:`, error);
        return null;
      }
    )
  );

  const results = await Promise.all(promises);
  return results.filter((result): result is WeatherForecast => result !== null);
}

// Function to clear weather cache (useful for development/testing)
export function clearWeatherCache(): void {
  weatherCache.clear();
}

// Function to get cache statistics
export function getWeatherCacheStats(): { size: number; keys: string[] } {
  return {
    size: weatherCache.size,
    keys: Array.from(weatherCache.keys()),
  };
}
