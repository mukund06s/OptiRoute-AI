/**
 * Weather Provider
 * Handles external OpenWeather API communication only
 */

import axios, { AxiosInstance } from 'axios';

export interface WeatherProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface OpenWeatherResponse {
  coord: { lon: number; lat: number };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  rain?: {
    '1h'?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export class WeatherProvider {
  private client: AxiosInstance;
  private apiKey: string;
  private retries: number;

  constructor(config: WeatherProviderConfig) {
    this.apiKey = config.apiKey;
    this.retries = config.retries || 3;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.openweathermap.org/data/2.5',
      timeout: config.timeout || 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchWeather(latitude: number, longitude: number): Promise<OpenWeatherResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await this.client.get<OpenWeatherResponse>('/weather', {
          params: {
            lat: latitude,
            lon: longitude,
            appid: this.apiKey,
            units: 'metric',
          },
        });

        if (response.status === 200 && response.data) {
          return response.data;
        }

        throw new Error(`Unexpected response status: ${response.status}`);
      } catch (error: any) {
        lastError = error;

        if (error.response?.status === 401) {
          throw new Error('Invalid API key');
        }

        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded');
        }

        if (attempt < this.retries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          await this.sleep(backoffMs);
        }
      }
    }

    throw new Error(
      `Failed to fetch weather after ${this.retries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey !== 'your_key_here');
  }
}

export function createWeatherProvider(): WeatherProvider | null {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey || apiKey === 'your_key_here') {
    console.warn('[WeatherProvider] No valid API key configured. Using mock mode.');
    return null;
  }

  return new WeatherProvider({
    apiKey,
    timeout: 5000,
    retries: 3,
  });
}
