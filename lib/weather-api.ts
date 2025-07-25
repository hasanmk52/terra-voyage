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
import { useMocks, mockWeather, simulateDelay } from "./mock-data";

export class WeatherAPI {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || "";
  }

  async getCurrentWeather(location: { lat: number; lon: number }) {
    if (useMocks) {
      await simulateDelay("weather");
      return mockWeather.current;
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&units=metric`
    );

    return response.json();
  }

  async getWeatherForecast(location: { lat: number; lon: number }) {
    if (useMocks) {
      await simulateDelay("weather");
      return mockWeather.forecast;
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&units=metric`
    );

    return response.json();
  }

  async getWeatherAlerts(location: { lat: number; lon: number }) {
    if (useMocks) {
      await simulateDelay("weather");
      return {
        alerts: [], // No alerts in mock data by default
      };
    }

    // Real API implementation here
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${location.lat}&lon=${location.lon}&appid=${this.apiKey}&exclude=current,minutely,hourly,daily`
    );

    return response.json();
  }
}

// Data processing functions
export function processCurrentWeather(
  weather: CurrentWeather
): ProcessedWeather {
  const condition = weather.weather[0];
  const temp = kelvinToCelsius(weather.main.temp);
  const windSpeed = weather.wind ? mpsToKmh(weather.wind.speed) : 0;
  const precipitation = weather.rain?.["1h"] || weather.snow?.["1h"] || 0;

  return {
    date: new Date(weather.dt * 1000).toISOString().split("T")[0],
    temperature: {
      current: temp,
      min: kelvinToCelsius(weather.main.temp_min),
      max: kelvinToCelsius(weather.main.temp_max),
      feelsLike: kelvinToCelsius(weather.main.feels_like),
    },
    condition: {
      main: condition.main,
      description: condition.description,
      icon: condition.icon,
      severity: getWeatherSeverity(
        condition.description,
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
      direction: weather.wind ? getWindDirection(weather.wind.deg) : "N",
      gust: weather.wind?.gust ? mpsToKmh(weather.wind.gust) : undefined,
    },
    humidity: weather.main.humidity,
    visibility: weather.visibility ? weather.visibility / 1000 : 10, // Convert to km
    sunrise: new Date(weather.sys.sunrise * 1000).toTimeString().slice(0, 5),
    sunset: new Date(weather.sys.sunset * 1000).toTimeString().slice(0, 5),
    isExtreme:
      getWeatherSeverity(
        condition.description,
        temp,
        windSpeed,
        precipitation
      ) === "severe",
  };
}

export function processForecastData(
  forecast: ForecastResponse
): ProcessedWeather[] {
  // Group forecast items by date and get daily summaries
  const dailyData = new Map<string, any[]>();

  forecast.list.forEach((item) => {
    const date = new Date(item.dt * 1000).toISOString().split("T")[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, []);
    }
    dailyData.get(date)!.push(item);
  });

  const processedDays: ProcessedWeather[] = [];

  for (const [date, items] of dailyData) {
    if (items.length === 0) continue;

    // Calculate daily aggregates
    const temps = items.map((item) => kelvinToCelsius(item.main.temp));
    const minTemp = Math.min(
      ...items.map((item) => kelvinToCelsius(item.main.temp_min))
    );
    const maxTemp = Math.max(
      ...items.map((item) => kelvinToCelsius(item.main.temp_max))
    );
    const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
    const feelsLike =
      items.reduce(
        (sum, item) => sum + kelvinToCelsius(item.main.feels_like),
        0
      ) / items.length;

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

    const current = processCurrentWeather(currentWeather);
    const forecast = processForecastData(forecastData);

    return {
      location: {
        name: locationName || currentWeather.name,
        country: currentWeather.sys.country,
        coordinates: { lat, lng },
      },
      current,
      forecast,
      lastUpdated: new Date().toISOString(),
      source: "openweathermap",
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
