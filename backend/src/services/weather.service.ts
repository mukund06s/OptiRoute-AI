/**
 * Weather Service
 * Orchestrates weather provider, cache, normalization, and database updates
 */

import { prisma } from '../lib/prisma';
import { createWeatherProvider, WeatherProvider, OpenWeatherResponse } from './weatherProvider';
import { weatherCache } from './weatherCache';

export interface WeatherResult {
  hubId: number;
  hubName: string;
  condition: string;
  conditionCode: number;
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitationMm: number;
  windSpeedKmh: number;
  visibilityKm: number;
  forecastFor: Date;
  fetchedAt: Date;
  source: 'api' | 'cache' | 'database' | 'mock';
}

export class WeatherService {
  private provider: WeatherProvider | null;

  constructor() {
    this.provider = createWeatherProvider();
  }

  async getWeatherForHub(hubId: number): Promise<WeatherResult> {
    const cached = weatherCache.get(hubId);
    if (cached) {
      return { ...cached, source: 'cache' as const };
    }

    const hub = await prisma.hub.findUnique({
      where: { id: hubId },
    });

    if (!hub) {
      throw new Error(`Hub not found: ${hubId}`);
    }

    if (!this.provider) {
      return this.getFallbackWeather(hubId, hub.name);
    }

    try {
      const response = await this.provider.fetchWeather(
        parseFloat(hub.latitude.toString()),
        parseFloat(hub.longitude.toString())
      );

      const normalized = this.normalizeWeatherResponse(response, hubId, hub.name);

      await this.saveWeatherEvent(normalized);

      weatherCache.set(hubId, normalized);

      return { ...normalized, source: 'api' as const };
    } catch (error: any) {
      console.error(`[WeatherService] API failed for hub ${hubId}:`, error.message);
      return this.getFallbackWeather(hubId, hub.name);
    }
  }

  async getWeatherForAllHubs(): Promise<WeatherResult[]> {
    const hubs = await prisma.hub.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const results = await Promise.allSettled(
      hubs.map((hub) => this.getWeatherForHub(hub.id))
    );

    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<WeatherResult>).value);
  }

  private normalizeWeatherResponse(
    response: OpenWeatherResponse,
    hubId: number,
    hubName: string
  ): Omit<WeatherResult, 'source'> {
    const weatherData = response.weather[0];
    const mainCondition = weatherData.main;
    const conditionCode = weatherData.id;

    const normalizedCondition = this.normalizeCondition(mainCondition, conditionCode);

    const precipitationMm = response.rain?.['1h'] || 0;

    const windSpeedKmh = response.wind.speed * 3.6;

    const visibilityKm = (response.visibility || 10000) / 1000;

    return {
      hubId,
      hubName,
      condition: normalizedCondition,
      conditionCode,
      temperature: response.main.temp,
      feelsLike: response.main.feels_like,
      humidity: response.main.humidity,
      precipitationMm,
      windSpeedKmh,
      visibilityKm,
      forecastFor: new Date(response.dt * 1000),
      fetchedAt: new Date(),
    };
  }

  private normalizeCondition(mainCondition: string, conditionCode: number): string {
    if (conditionCode === 800) {
      return 'Clear';
    }

    if (conditionCode === 801 || conditionCode === 802) {
      return 'Partly Cloudy';
    }

    if (conditionCode === 803 || conditionCode === 804) {
      return 'Cloudy';
    }

    if (conditionCode >= 500 && conditionCode < 502) {
      return 'Light Rain';
    }

    if (conditionCode >= 502 && conditionCode < 511) {
      return 'Heavy Rain';
    }

    if (conditionCode >= 511 && conditionCode < 520) {
      return 'Rain';
    }

    if (conditionCode >= 520 && conditionCode < 600) {
      return 'Rain';
    }

    if (conditionCode >= 200 && conditionCode < 300) {
      return 'Thunderstorm';
    }

    if (conditionCode >= 700 && conditionCode < 800) {
      return 'Fog';
    }

    if (mainCondition.toLowerCase().includes('rain')) {
      return 'Rain';
    }
    if (mainCondition.toLowerCase().includes('thunder')) {
      return 'Thunderstorm';
    }
    if (mainCondition.toLowerCase().includes('fog') || mainCondition.toLowerCase().includes('mist')) {
      return 'Fog';
    }
    if (mainCondition.toLowerCase().includes('cloud')) {
      return 'Cloudy';
    }

    return 'Clear';
  }

  private async saveWeatherEvent(weather: Omit<WeatherResult, 'source'>): Promise<void> {
    try {
      await prisma.weatherEvent.create({
        data: {
          hubId: weather.hubId,
          condition: weather.condition,
          conditionCode: weather.conditionCode,
          temperature: weather.temperature,
          feelsLike: weather.feelsLike,
          humidity: weather.humidity,
          precipitationMm: weather.precipitationMm,
          windSpeedKmh: weather.windSpeedKmh,
          visibilityKm: weather.visibilityKm,
          forecastFor: weather.forecastFor,
          fetchedAt: weather.fetchedAt,
        },
      });
    } catch (error) {
      console.error('[WeatherService] Failed to save weather event:', error);
    }
  }

  private async getFallbackWeather(hubId: number, hubName: string): Promise<WeatherResult> {
    try {
      const latestWeather = await prisma.weatherEvent.findFirst({
        where: { hubId },
        orderBy: { fetchedAt: 'desc' },
      });

      if (latestWeather) {
        const result = {
          hubId,
          hubName,
          condition: latestWeather.condition || 'Clear',
          conditionCode: latestWeather.conditionCode || 800,
          temperature: parseFloat(latestWeather.temperature?.toString() || '25'),
          feelsLike: parseFloat(latestWeather.feelsLike?.toString() || '25'),
          humidity: latestWeather.humidity || 60,
          precipitationMm: parseFloat(latestWeather.precipitationMm.toString()),
          windSpeedKmh: parseFloat(latestWeather.windSpeedKmh?.toString() || '10'),
          visibilityKm: parseFloat(latestWeather.visibilityKm?.toString() || '10'),
          forecastFor: latestWeather.forecastFor,
          fetchedAt: latestWeather.fetchedAt,
          source: 'database' as const,
        };

        weatherCache.set(hubId, result);
        return result;
      }
    } catch (error) {
      console.error('[WeatherService] Database fallback failed:', error);
    }

    const mockWeather = this.getMockWeather(hubId, hubName);
    weatherCache.set(hubId, mockWeather);
    return mockWeather;
  }

  private getMockWeather(hubId: number, hubName: string): WeatherResult {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Rain'];
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      hubId,
      hubName,
      condition: randomCondition,
      conditionCode: 800,
      temperature: 25 + Math.random() * 10,
      feelsLike: 25 + Math.random() * 10,
      humidity: 50 + Math.floor(Math.random() * 30),
      precipitationMm: randomCondition.includes('Rain') ? Math.random() * 5 : 0,
      windSpeedKmh: 10 + Math.random() * 20,
      visibilityKm: 8 + Math.random() * 2,
      forecastFor: new Date(),
      fetchedAt: new Date(),
      source: 'mock',
    };
  }

  invalidateCache(hubId: number): boolean {
    return weatherCache.invalidate(hubId);
  }

  invalidateAllCache(): void {
    weatherCache.invalidateAll();
  }

  getCacheStats() {
    return weatherCache.getStats();
  }
}

export const weatherService = new WeatherService();
