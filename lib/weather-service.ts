import { WeatherForecast, ProcessedWeather } from './weather-types';
import { WeatherAPI as OpenWeatherAPI, processCurrentWeather, processForecastData } from './weather-api';

// Weather service priorities and configuration
export interface WeatherServiceConfig {
  timeout: number;
  cacheHours: number;
  retryAttempts: number;
  enabled: boolean;
}

export interface WeatherProvider {
  name: string;
  priority: number;
  getCurrentWeather(lat: number, lng: number): Promise<any>;
  getForecast(lat: number, lng: number): Promise<any>;
  processCurrentWeather(data: any): ProcessedWeather;
  processForecast(data: any): ProcessedWeather[];
  config: WeatherServiceConfig;
}

// Cache interface
interface WeatherCache {
  data: WeatherForecast;
  timestamp: number;
  source: string;
}

// Weather API service for fallback
class WeatherAPIService implements WeatherProvider {
  name = 'WeatherAPI';
  priority = 2;
  private apiKey: string;
  
  config: WeatherServiceConfig = {
    timeout: 10000,
    cacheHours: 3,
    retryAttempts: 2,
    enabled: true
  };

  constructor() {
    this.apiKey = process.env.WEATHERAPI_KEY || '';
  }

  async getCurrentWeather(lat: number, lng: number) {
    if (!this.apiKey) {
      throw new Error('WeatherAPI key not configured');
    }

    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${lat},${lng}&aqi=no`,
      { 
        timeout: this.config.timeout,
        headers: { 'User-Agent': 'TerraVoyage/1.0' }
      }
    );

    if (!response.ok) {
      throw new Error(`WeatherAPI error: ${response.status}`);
    }

    return response.json();
  }

  async getForecast(lat: number, lng: number) {
    if (!this.apiKey) {
      throw new Error('WeatherAPI key not configured');
    }

    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${this.apiKey}&q=${lat},${lng}&days=7&aqi=no&alerts=yes`,
      { 
        timeout: this.config.timeout,
        headers: { 'User-Agent': 'TerraVoyage/1.0' }
      }
    );

    if (!response.ok) {
      throw new Error(`WeatherAPI forecast error: ${response.status}`);
    }

    return response.json();
  }

  processCurrentWeather(data: any): ProcessedWeather {
    const current = data.current;
    const location = data.location;
    
    return {
      date: new Date().toISOString().split('T')[0],
      temperature: {
        current: Math.round(current.temp_c),
        min: Math.round(current.temp_c), // WeatherAPI doesn't provide min/max for current
        max: Math.round(current.temp_c),
        feelsLike: Math.round(current.feelslike_c)
      },
      condition: {
        main: current.condition.text.split(' ')[0],
        description: current.condition.text.toLowerCase(),
        icon: this.mapWeatherAPIIcon(current.condition.icon),
        severity: this.getWeatherSeverity(current.condition.text, current.temp_c, current.wind_kph, current.precip_mm)
      },
      precipitation: {
        probability: 0, // Not available in current weather
        amount: current.precip_mm || 0,
        type: current.precip_mm > 0 ? 'rain' : 'none'
      },
      wind: {
        speed: Math.round(current.wind_kph),
        direction: current.wind_dir,
        gust: current.gust_kph ? Math.round(current.gust_kph) : undefined
      },
      humidity: current.humidity,
      visibility: current.vis_km,
      sunrise: '06:00', // WeatherAPI doesn't provide this in current weather
      sunset: '18:00',
      isExtreme: this.getWeatherSeverity(current.condition.text, current.temp_c, current.wind_kph, current.precip_mm) === 'severe'
    };
  }

  processForecast(data: any): ProcessedWeather[] {
    return data.forecast.forecastday.map((day: any) => {
      const dayData = day.day;
      const astro = day.astro;
      
      return {
        date: day.date,
        temperature: {
          current: Math.round((dayData.maxtemp_c + dayData.mintemp_c) / 2),
          min: Math.round(dayData.mintemp_c),
          max: Math.round(dayData.maxtemp_c),
          feelsLike: Math.round(dayData.avgtemp_c)
        },
        condition: {
          main: dayData.condition.text.split(' ')[0],
          description: dayData.condition.text.toLowerCase(),
          icon: this.mapWeatherAPIIcon(dayData.condition.icon),
          severity: this.getWeatherSeverity(dayData.condition.text, dayData.avgtemp_c, dayData.maxwind_kph, dayData.totalprecip_mm)
        },
        precipitation: {
          probability: Math.round(dayData.daily_chance_of_rain || 0),
          amount: dayData.totalprecip_mm || 0,
          type: dayData.totalprecip_mm > 0 ? 'rain' : 'none'
        },
        wind: {
          speed: Math.round(dayData.maxwind_kph),
          direction: 'N', // WeatherAPI doesn't provide daily wind direction
          gust: undefined
        },
        humidity: dayData.avghumidity,
        visibility: dayData.avgvis_km,
        sunrise: astro.sunrise,
        sunset: astro.sunset,
        isExtreme: this.getWeatherSeverity(dayData.condition.text, dayData.avgtemp_c, dayData.maxwind_kph, dayData.totalprecip_mm) === 'severe'
      };
    });
  }

  private mapWeatherAPIIcon(iconUrl: string): string {
    // Map WeatherAPI icons to OpenWeatherMap icon format
    const iconMap: Record<string, string> = {
      '113': '01d', // Sunny/Clear
      '116': '02d', // Partly cloudy
      '119': '03d', // Cloudy
      '122': '04d', // Overcast
      '143': '50d', // Mist
      '176': '09d', // Patchy rain possible
      '179': '13d', // Patchy snow possible
      '182': '13d', // Patchy sleet possible
      '185': '13d', // Patchy freezing drizzle
      '200': '11d', // Thundery outbreaks possible
      '227': '13d', // Blowing snow
      '230': '13d', // Blizzard
      '248': '50d', // Fog
      '260': '50d', // Freezing fog
      '263': '09d', // Patchy light drizzle
      '266': '09d', // Light drizzle
      '281': '13d', // Freezing drizzle
      '284': '13d', // Heavy freezing drizzle
      '293': '09d', // Patchy light rain
      '296': '10d', // Light rain
      '299': '09d', // Moderate rain at times
      '302': '10d', // Moderate rain
      '305': '10d', // Heavy rain at times
      '308': '10d', // Heavy rain
      '311': '13d', // Light freezing rain
      '314': '13d', // Moderate or heavy freezing rain
      '317': '13d', // Light sleet
      '320': '13d', // Moderate or heavy sleet
      '323': '13d', // Patchy light snow
      '326': '13d', // Light snow
      '329': '13d', // Patchy moderate snow
      '332': '13d', // Moderate snow
      '335': '13d', // Patchy heavy snow
      '338': '13d', // Heavy snow
      '350': '13d', // Ice pellets
      '353': '09d', // Light rain shower
      '356': '10d', // Moderate or heavy rain shower
      '359': '10d', // Torrential rain shower
      '362': '13d', // Light sleet showers
      '365': '13d', // Moderate or heavy sleet showers
      '368': '13d', // Light snow showers
      '371': '13d', // Moderate or heavy snow showers
      '374': '13d', // Light showers of ice pellets
      '377': '13d', // Moderate or heavy showers of ice pellets
      '386': '11d', // Patchy light rain with thunder
      '389': '11d', // Moderate or heavy rain with thunder
      '392': '11d', // Patchy light snow with thunder
      '395': '11d'  // Moderate or heavy snow with thunder
    };
    
    const iconCode = iconUrl.split('/').pop()?.split('.')[0] || '113';
    return iconMap[iconCode] || '01d';
  }

  private getWeatherSeverity(condition: string, temp: number, windSpeed: number, precipitation: number): 'mild' | 'moderate' | 'severe' {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('thunderstorm') || conditionLower.includes('blizzard') || 
        temp < -10 || temp > 40 || windSpeed > 50 || precipitation > 20) {
      return 'severe';
    }
    
    if (conditionLower.includes('heavy') || conditionLower.includes('snow') ||
        temp < 0 || temp > 35 || windSpeed > 25 || precipitation > 5) {
      return 'moderate';
    }
    
    return 'mild';
  }
}

// Historical weather fallback service
class HistoricalWeatherService implements WeatherProvider {
  name = 'Historical';
  priority = 3;
  
  config: WeatherServiceConfig = {
    timeout: 5000,
    cacheHours: 24, // Cache historical data longer
    retryAttempts: 1,
    enabled: true
  };

  async getCurrentWeather(lat: number, lng: number) {
    // Return current date historical average
    const month = new Date().getMonth() + 1;
    return this.getHistoricalData(lat, lng, month);
  }

  async getForecast(lat: number, lng: number) {
    // Return historical averages for next 7 days
    const currentDate = new Date();
    const forecasts = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      const month = date.getMonth() + 1;
      const historical = this.getHistoricalData(lat, lng, month);
      forecasts.push({
        ...historical,
        date: date.toISOString().split('T')[0]
      });
    }
    
    return { forecasts };
  }

  processCurrentWeather(data: any): ProcessedWeather {
    return this.createProcessedWeather(data, new Date().toISOString().split('T')[0]);
  }

  processForecast(data: any): ProcessedWeather[] {
    return data.forecasts.map((forecast: any) => this.createProcessedWeather(forecast, forecast.date));
  }

  private getHistoricalData(lat: number, lng: number, month: number) {
    // Simplified historical climate data based on latitude and month
    const climate = this.getClimateData(lat, month);
    
    return {
      temperature: climate.temperature,
      condition: climate.condition,
      precipitation: climate.precipitation,
      humidity: climate.humidity,
      wind: climate.wind
    };
  }

  private getClimateData(lat: number, month: number) {
    // Simplified climate model based on latitude and month
    const isNorthernHemisphere = lat > 0;
    const season = this.getSeason(month, isNorthernHemisphere);
    
    // Temperature based on latitude and season
    let baseTemp = 20; // Default comfortable temperature
    
    if (Math.abs(lat) > 60) { // Polar regions
      baseTemp = season === 'winter' ? -15 : season === 'summer' ? 5 : -5;
    } else if (Math.abs(lat) > 30) { // Temperate regions
      baseTemp = season === 'winter' ? 5 : season === 'summer' ? 25 : 15;
    } else { // Tropical regions
      baseTemp = season === 'winter' ? 22 : season === 'summer' ? 28 : 25;
    }
    
    // Add random variation
    const variation = (Math.random() - 0.5) * 10;
    const temp = Math.round(baseTemp + variation);
    
    return {
      temperature: {
        min: temp - 5,
        max: temp + 5,
        current: temp,
        feelsLike: temp
      },
      condition: {
        main: this.getSeasonalCondition(season),
        description: `typical ${season} weather`,
        icon: this.getSeasonalIcon(season),
        severity: 'mild' as const
      },
      precipitation: {
        probability: season === 'winter' ? 40 : season === 'summer' ? 20 : 30,
        amount: season === 'winter' ? 2 : season === 'summer' ? 1 : 1.5,
        type: 'rain' as const
      },
      humidity: season === 'winter' ? 70 : season === 'summer' ? 60 : 65,
      wind: {
        speed: 15,
        direction: 'SW',
        gust: undefined
      }
    };
  }

  private getSeason(month: number, isNorthernHemisphere: boolean): string {
    const seasons = ['winter', 'spring', 'summer', 'autumn'];
    let seasonIndex = Math.floor((month - 1) / 3);
    
    if (!isNorthernHemisphere) {
      seasonIndex = (seasonIndex + 2) % 4; // Shift seasons for southern hemisphere
    }
    
    return seasons[seasonIndex];
  }

  private getSeasonalCondition(season: string): string {
    const conditions = {
      winter: 'Clouds',
      spring: 'Clear',
      summer: 'Clear',
      autumn: 'Clouds'
    };
    return conditions[season as keyof typeof conditions] || 'Clear';
  }

  private getSeasonalIcon(season: string): string {
    const icons = {
      winter: '03d',
      spring: '01d',
      summer: '01d',
      autumn: '03d'
    };
    return icons[season as keyof typeof icons] || '01d';
  }

  private createProcessedWeather(data: any, date: string): ProcessedWeather {
    return {
      date,
      temperature: data.temperature,
      condition: data.condition,
      precipitation: data.precipitation,
      wind: data.wind,
      humidity: data.humidity,
      visibility: 10,
      sunrise: '06:00',
      sunset: '18:00',
      isExtreme: false
    };
  }
}

// Main weather service with fallback chain
export class WeatherFallbackService {
  private providers: WeatherProvider[] = [];
  private cache = new Map<string, WeatherCache>();
  private monitoring = {
    requests: 0,
    successes: 0,
    failures: 0,
    providerStats: new Map<string, { requests: number; successes: number; failures: number }>()
  };

  constructor() {
    // Initialize providers in priority order
    this.providers = [
      new OpenWeatherAPIProvider(),
      new WeatherAPIService(),
      new HistoricalWeatherService()
    ].sort((a, b) => a.priority - b.priority);

    console.log('🌤️ Weather fallback service initialized with providers:', 
      this.providers.map(p => p.name).join(', '));
  }

  async getWeatherForecast(
    lat: number,
    lng: number,
    locationName?: string
  ): Promise<WeatherForecast> {
    const cacheKey = `forecast_${lat}_${lng}`;
    this.monitoring.requests++;

    // Check cache first
    const cached = this.getCachedWeather(cacheKey);
    if (cached) {
      console.log(`🔄 Weather cache hit for ${locationName || `${lat},${lng}`} from ${cached.source}`);
      return cached.data;
    }

    // Try each provider in order
    for (const provider of this.providers) {
      if (!provider.config.enabled) continue;

      try {
        console.log(`🌤️ Attempting weather fetch with ${provider.name}...`);
        
        const [currentWeather, forecastData] = await Promise.all([
          this.retryWithTimeout(
            () => provider.getCurrentWeather(lat, lng),
            provider.config.retryAttempts,
            provider.config.timeout
          ),
          this.retryWithTimeout(
            () => provider.getForecast(lat, lng),
            provider.config.retryAttempts,
            provider.config.timeout
          )
        ]);

        const current = provider.processCurrentWeather(currentWeather);
        const forecast = provider.processForecast(forecastData);

        const result: WeatherForecast = {
          location: {
            name: locationName || 'Unknown Location',
            country: 'Unknown',
            coordinates: { lat, lng }
          },
          current,
          forecast,
          lastUpdated: new Date().toISOString(),
          source: provider.name.toLowerCase() as any
        };

        // Cache the result
        this.setCachedWeather(cacheKey, result, provider.name, provider.config.cacheHours);
        
        // Update monitoring stats
        this.updateStats(provider.name, true);
        this.monitoring.successes++;
        
        console.log(`✅ Weather data successfully fetched from ${provider.name}`);
        return result;

      } catch (error) {
        console.error(`❌ ${provider.name} failed:`, error);
        this.updateStats(provider.name, false);
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    this.monitoring.failures++;
    throw new Error('All weather providers failed. Please try again later.');
  }

  private async retryWithTimeout<T>(
    fn: () => Promise<T>,
    retries: number,
    timeout: number
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      } catch (error) {
        if (attempt === retries) throw error;
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private getCachedWeather(key: string): WeatherCache | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > (3 * 60 * 60 * 1000); // 3 hours default
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  private setCachedWeather(key: string, data: WeatherForecast, source: string, hours: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      source
    });
  }

  private updateStats(providerName: string, success: boolean): void {
    let stats = this.monitoring.providerStats.get(providerName);
    if (!stats) {
      stats = { requests: 0, successes: 0, failures: 0 };
      this.monitoring.providerStats.set(providerName, stats);
    }
    
    stats.requests++;
    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
  }

  getMonitoringStats() {
    return {
      ...this.monitoring,
      providerStats: Object.fromEntries(this.monitoring.providerStats),
      cacheSize: this.cache.size
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Wrapper for existing OpenWeatherAPI to implement WeatherProvider interface
class OpenWeatherAPIProvider implements WeatherProvider {
  name = 'OpenWeatherMap';
  priority = 1;
  private api = new OpenWeatherAPI();
  
  config: WeatherServiceConfig = {
    timeout: 10000,
    cacheHours: 3,
    retryAttempts: 3,
    enabled: true
  };

  async getCurrentWeather(lat: number, lng: number) {
    return this.api.getCurrentWeather({ lat, lon: lng });
  }

  async getForecast(lat: number, lng: number) {
    return this.api.getWeatherForecast({ lat, lon: lng });
  }

  processCurrentWeather(data: any): ProcessedWeather {
    return processCurrentWeather(data);
  }

  processForecast(data: any): ProcessedWeather[] {
    return processForecastData(data);
  }
}

// Export singleton instance
export const weatherService = new WeatherFallbackService();