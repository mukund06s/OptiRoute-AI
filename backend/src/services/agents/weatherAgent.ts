/**
 * Weather Agent - Coordinates Weather Operations
 * Reuses WeatherService for all business logic
 */

import { weatherService, WeatherResult } from '../weather.service';
import { AgentStep } from './supervisorAgent';

export type WeatherImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ShipmentContext {
  shipmentId: number;
  trackingId: string;
  currentHubId: number | null;
  destinationHubId: number;
  activeRoute: number[];
  priority: string;
}

export interface WeatherAgentResult {
  success: boolean;
  hubsProcessed: number;
  weatherData: WeatherResult[];
  impactAssessment: {
    highestImpact: WeatherImpactLevel;
    criticalHubs: number[];
    highRiskHubs: number[];
    mediumRiskHubs: number[];
    lowRiskHubs: number[];
  };
  recommendations: string[];
  confidence: number;
  metadata: {
    executionTimeMs: number;
    cacheHitRate: number;
    failedHubs: number[];
    source: string;
  };
  errors: string[];
}

export interface WeatherImpactAnalysis {
  hubId: number;
  hubName: string;
  impactLevel: WeatherImpactLevel;
  condition: string;
  temperature: number;
  precipitationMm: number;
  windSpeedKmh: number;
  visibilityKm: number;
  riskFactors: string[];
  recommendation: string;
}

export class WeatherAgent {
  private initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async initialize(): Promise<boolean> {
    console.log('[WeatherAgent] Initializing...');
    this.initialized = true;
    console.log('[WeatherAgent] Initialized successfully');
    return true;
  }

  async execute(
    context: ShipmentContext,
    step: AgentStep
  ): Promise<WeatherAgentResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    console.log(
      `[WeatherAgent] Executing for shipment ${context.trackingId}`
    );

    try {
      const weatherData = await this.collectWeather(context);

      const impactAnalyses = weatherData.map((weather) =>
        this.evaluateWeatherImpact(weather)
      );

      const impactAssessment = this.aggregateImpact(impactAnalyses);

      const recommendations = this.generateRecommendations(
        impactAnalyses,
        context
      );

      const cacheStats = weatherService.getCacheStats();
      const executionTimeMs = Date.now() - startTime;

      const result: WeatherAgentResult = {
        success: true,
        hubsProcessed: weatherData.length,
        weatherData,
        impactAssessment,
        recommendations,
        confidence: this.calculateConfidence(weatherData, impactAnalyses),
        metadata: {
          executionTimeMs,
          cacheHitRate: cacheStats.hitRate,
          failedHubs: [],
          source: 'weather_service',
        },
        errors: [],
      };

      console.log(
        `[WeatherAgent] Completed: ${weatherData.length} hubs processed in ${executionTimeMs}ms`
      );
      console.log(
        `[WeatherAgent] Impact: ${result.impactAssessment.highestImpact}`
      );

      return result;
    } catch (error: any) {
      console.error('[WeatherAgent] Execution failed:', error.message);

      return {
        success: false,
        hubsProcessed: 0,
        weatherData: [],
        impactAssessment: {
          highestImpact: 'LOW',
          criticalHubs: [],
          highRiskHubs: [],
          mediumRiskHubs: [],
          lowRiskHubs: [],
        },
        recommendations: ['Weather data unavailable, using fallback'],
        confidence: 0,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          cacheHitRate: 0,
          failedHubs: [],
          source: 'error',
        },
        errors: [error.message],
      };
    }
  }

  async collectWeather(context: ShipmentContext): Promise<WeatherResult[]> {
    const hubIds = this.getRelevantHubIds(context);

    console.log(
      `[WeatherAgent] Collecting weather for ${hubIds.length} hubs`
    );

    const weatherPromises = hubIds.map((hubId) =>
      weatherService.getWeatherForHub(hubId).catch((error) => {
        console.error(
          `[WeatherAgent] Failed to fetch weather for hub ${hubId}:`,
          error.message
        );
        return null;
      })
    );

    const results = await Promise.all(weatherPromises);

    return results.filter((r): r is WeatherResult => r !== null);
  }

  async updateWeather(hubIds: number[]): Promise<WeatherResult[]> {
    console.log(`[WeatherAgent] Updating weather for ${hubIds.length} hubs`);

    for (const hubId of hubIds) {
      weatherService.invalidateCache(hubId);
    }

    const weatherPromises = hubIds.map((hubId) =>
      weatherService.getWeatherForHub(hubId).catch((error) => {
        console.error(
          `[WeatherAgent] Failed to update weather for hub ${hubId}:`,
          error.message
        );
        return null;
      })
    );

    const results = await Promise.all(weatherPromises);

    return results.filter((r): r is WeatherResult => r !== null);
  }

  evaluateWeatherImpact(weather: WeatherResult): WeatherImpactAnalysis {
    const condition = weather.condition;
    const precipitationMm = weather.precipitationMm;
    const windSpeedKmh = weather.windSpeedKmh;
    const visibilityKm = weather.visibilityKm;
    const temperature = weather.temperature;

    const riskFactors: string[] = [];
    let impactLevel: WeatherImpactLevel = 'LOW';

    if (condition === 'Thunderstorm') {
      impactLevel = 'CRITICAL';
      riskFactors.push('thunderstorm_conditions');
    } else if (condition === 'Heavy Rain') {
      impactLevel = 'CRITICAL';
      riskFactors.push('heavy_rainfall');
    } else if (condition === 'Fog' && visibilityKm < 1) {
      impactLevel = 'CRITICAL';
      riskFactors.push('severe_fog');
    } else if (condition === 'Rain' || precipitationMm > 5) {
      impactLevel = 'HIGH';
      riskFactors.push('rain_conditions');
    } else if (condition === 'Fog' || visibilityKm < 3) {
      impactLevel = 'HIGH';
      riskFactors.push('low_visibility');
    } else if (windSpeedKmh > 60) {
      impactLevel = 'HIGH';
      riskFactors.push('strong_winds');
    } else if (condition === 'Light Rain' || precipitationMm > 0) {
      impactLevel = 'MEDIUM';
      riskFactors.push('light_rain');
    } else if (windSpeedKmh > 40) {
      impactLevel = 'MEDIUM';
      riskFactors.push('moderate_winds');
    } else if (condition === 'Cloudy' || visibilityKm < 5) {
      impactLevel = 'MEDIUM';
      riskFactors.push('reduced_visibility');
    } else if (temperature > 40 || temperature < 0) {
      impactLevel = 'MEDIUM';
      riskFactors.push('extreme_temperature');
    }

    const recommendation = this.generateImpactRecommendation(
      impactLevel,
      condition,
      riskFactors
    );

    return {
      hubId: weather.hubId,
      hubName: weather.hubName,
      impactLevel,
      condition,
      temperature,
      precipitationMm,
      windSpeedKmh,
      visibilityKm,
      riskFactors,
      recommendation,
    };
  }

  private getRelevantHubIds(context: ShipmentContext): number[] {
    const hubIds = new Set<number>();

    if (context.currentHubId) {
      hubIds.add(context.currentHubId);
    }

    hubIds.add(context.destinationHubId);

    context.activeRoute.forEach((hubId) => hubIds.add(hubId));

    return Array.from(hubIds);
  }

  private aggregateImpact(
    analyses: WeatherImpactAnalysis[]
  ): WeatherAgentResult['impactAssessment'] {
    const criticalHubs: number[] = [];
    const highRiskHubs: number[] = [];
    const mediumRiskHubs: number[] = [];
    const lowRiskHubs: number[] = [];

    analyses.forEach((analysis) => {
      switch (analysis.impactLevel) {
        case 'CRITICAL':
          criticalHubs.push(analysis.hubId);
          break;
        case 'HIGH':
          highRiskHubs.push(analysis.hubId);
          break;
        case 'MEDIUM':
          mediumRiskHubs.push(analysis.hubId);
          break;
        case 'LOW':
          lowRiskHubs.push(analysis.hubId);
          break;
      }
    });

    let highestImpact: WeatherImpactLevel = 'LOW';
    if (criticalHubs.length > 0) {
      highestImpact = 'CRITICAL';
    } else if (highRiskHubs.length > 0) {
      highestImpact = 'HIGH';
    } else if (mediumRiskHubs.length > 0) {
      highestImpact = 'MEDIUM';
    }

    return {
      highestImpact,
      criticalHubs,
      highRiskHubs,
      mediumRiskHubs,
      lowRiskHubs,
    };
  }

  private generateRecommendations(
    analyses: WeatherImpactAnalysis[],
    context: ShipmentContext
  ): string[] {
    const recommendations: string[] = [];

    const criticalAnalyses = analyses.filter(
      (a) => a.impactLevel === 'CRITICAL'
    );
    const highAnalyses = analyses.filter((a) => a.impactLevel === 'HIGH');
    const mediumAnalyses = analyses.filter((a) => a.impactLevel === 'MEDIUM');

    if (criticalAnalyses.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalAnalyses.length} hub(s) experiencing severe weather conditions (${criticalAnalyses.map((a) => a.condition).join(', ')}). Immediate rerouting recommended.`
      );

      criticalAnalyses.forEach((analysis) => {
        recommendations.push(`${analysis.hubName}: ${analysis.recommendation}`);
      });
    }

    if (highAnalyses.length > 0) {
      recommendations.push(
        `HIGH RISK: ${highAnalyses.length} hub(s) with adverse weather. Route optimization recommended.`
      );
    }

    if (mediumAnalyses.length > 0 && context.priority === 'express') {
      recommendations.push(
        `MODERATE RISK: ${mediumAnalyses.length} hub(s) with suboptimal conditions. Monitor closely for express shipments.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Weather conditions are favorable across all hubs.');
    }

    return recommendations;
  }

  private generateImpactRecommendation(
    impactLevel: WeatherImpactLevel,
    condition: string,
    riskFactors: string[]
  ): string {
    switch (impactLevel) {
      case 'CRITICAL':
        return `CRITICAL: ${condition} conditions pose severe risk. Avoid this route if possible. Expect significant delays.`;
      case 'HIGH':
        return `HIGH RISK: ${condition} conditions likely to cause delays. Consider alternative routes.`;
      case 'MEDIUM':
        return `MODERATE: ${condition} conditions may impact delivery times. Monitor situation.`;
      case 'LOW':
      default:
        return `LOW RISK: ${condition} conditions are acceptable for transit.`;
    }
  }

  private calculateConfidence(
    weatherData: WeatherResult[],
    analyses: WeatherImpactAnalysis[]
  ): number {
    if (weatherData.length === 0) {
      return 0;
    }

    const apiCount = weatherData.filter((w) => w.source === 'api').length;
    const cacheCount = weatherData.filter((w) => w.source === 'cache').length;
    const dbCount = weatherData.filter((w) => w.source === 'database').length;
    const mockCount = weatherData.filter((w) => w.source === 'mock').length;

    const total = weatherData.length;

    const apiWeight = apiCount / total;
    const cacheWeight = cacheCount / total;
    const dbWeight = dbCount / total;
    const mockWeight = mockCount / total;

    const confidence =
      apiWeight * 1.0 + cacheWeight * 0.95 + dbWeight * 0.7 + mockWeight * 0.3;

    return Math.round(confidence * 100) / 100;
  }

  async generateResult(
    weatherData: WeatherResult[],
    impactAnalyses: WeatherImpactAnalysis[]
  ): Promise<WeatherAgentResult> {
    const impactAssessment = this.aggregateImpact(impactAnalyses);
    const recommendations = impactAnalyses.map((a) => a.recommendation);
    const confidence = this.calculateConfidence(weatherData, impactAnalyses);

    return {
      success: true,
      hubsProcessed: weatherData.length,
      weatherData,
      impactAssessment,
      recommendations,
      confidence,
      metadata: {
        executionTimeMs: 0,
        cacheHitRate: 0,
        failedHubs: [],
        source: 'weather_agent',
      },
      errors: [],
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const weatherAgent = new WeatherAgent();
