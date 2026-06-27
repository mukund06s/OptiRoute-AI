/**
 * Risk Agent - Coordinates Risk Assessment
 * Reuses ML Prediction Service for all ML logic
 */

import { prisma } from '../../lib/prisma';
import { mlClientService, MLPredictionRequest, MLPredictionResponse } from '../mlClient.service';
import { WeatherAgentResult } from './weatherAgent';
import { AgentStep } from './supervisorAgent';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ShipmentContext {
  shipmentId: number;
  trackingId: string;
  currentHubId: number | null;
  destinationHubId: number;
  activeRoute: number[];
  priority: string;
}

export interface RiskAgentResult {
  success: boolean;
  hubsProcessed: number;
  riskScores: RiskScoreData[];
  overallRisk: {
    highestRisk: RiskLevel;
    criticalHubs: number[];
    highRiskHubs: number[];
    mediumRiskHubs: number[];
    lowRiskHubs: number[];
  };
  recommendations: string[];
  confidence: number;
  metadata: {
    executionTimeMs: number;
    mlServiceAvailable: boolean;
    failedHubs: number[];
    source: string;
  };
  errors: string[];
}

export interface RiskScoreData {
  hubId: number;
  hubName: string;
  predictedRisk: RiskLevel;
  confidence: number;
  delayProbability: number;
  shapExplanation: {
    topFeatures: Array<{ feature: string; contribution: number }>;
    positiveContributors: Array<{ feature: string; contribution: number }>;
    negativeContributors: Array<{ feature: string; contribution: number }>;
    humanExplanation: string;
  };
  recommendation: string;
  weatherCondition?: string;
}

export class RiskAgent {
  private initialized: boolean;
  private mlServiceAvailable: boolean;

  constructor() {
    this.initialized = false;
    this.mlServiceAvailable = false;
  }

  async initialize(): Promise<boolean> {
    console.log('[RiskAgent] Initializing...');

    this.mlServiceAvailable = await mlClientService.checkHealth();

    if (this.mlServiceAvailable) {
      console.log('[RiskAgent] ML service is available');
    } else {
      console.warn('[RiskAgent] ML service is unavailable. Will use fallback.');
    }

    this.initialized = true;
    console.log('[RiskAgent] Initialized successfully');
    return true;
  }

  async execute(
    context: ShipmentContext,
    step: AgentStep,
    weatherResult?: WeatherAgentResult
  ): Promise<RiskAgentResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    console.log(`[RiskAgent] Executing for shipment ${context.trackingId}`);

    try {
      const riskScores = await this.collectPredictions(context, weatherResult);

      const overallRisk = this.aggregateRisk(riskScores);

      const recommendations = this.generateRecommendations(riskScores, context);

      const confidence = this.calculateConfidence(riskScores);

      await this.storeRiskScores(riskScores);

      const executionTimeMs = Date.now() - startTime;

      const result: RiskAgentResult = {
        success: true,
        hubsProcessed: riskScores.length,
        riskScores,
        overallRisk,
        recommendations,
        confidence,
        metadata: {
          executionTimeMs,
          mlServiceAvailable: this.mlServiceAvailable,
          failedHubs: [],
          source: 'ml_service',
        },
        errors: [],
      };

      console.log(
        `[RiskAgent] Completed: ${riskScores.length} hubs processed in ${executionTimeMs}ms`
      );
      console.log(`[RiskAgent] Overall risk: ${result.overallRisk.highestRisk}`);

      return result;
    } catch (error: any) {
      console.error('[RiskAgent] Execution failed:', error.message);

      return {
        success: false,
        hubsProcessed: 0,
        riskScores: [],
        overallRisk: {
          highestRisk: 'low',
          criticalHubs: [],
          highRiskHubs: [],
          mediumRiskHubs: [],
          lowRiskHubs: [],
        },
        recommendations: ['Risk assessment unavailable, using fallback'],
        confidence: 0,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          mlServiceAvailable: false,
          failedHubs: [],
          source: 'error',
        },
        errors: [error.message],
      };
    }
  }

  async collectPredictions(
    context: ShipmentContext,
    weatherResult?: WeatherAgentResult
  ): Promise<RiskScoreData[]> {
    const hubIds = this.getRelevantHubIds(context);

    console.log(`[RiskAgent] Collecting risk predictions for ${hubIds.length} hubs`);

    const shipment = await prisma.shipment.findUnique({
      where: { id: context.shipmentId },
      include: {
        originHub: true,
        destinationHub: true,
      },
    });

    if (!shipment) {
      throw new Error(`Shipment not found: ${context.shipmentId}`);
    }

    const route = await prisma.route.findFirst({
      where: {
        originHubId: shipment.originHubId,
        destinationHubId: shipment.destinationHubId,
      },
    });

    const hubs = await prisma.hub.findMany({
      where: { id: { in: hubIds } },
      select: { id: true, name: true },
    });
    const hubById = new Map(hubs.map((hub) => [hub.id, hub]));

    const weatherByHubId = new Map(
      (weatherResult?.weatherData ?? []).map((weather) => [weather.hubId, weather])
    );

    const predictions = await Promise.all(
      hubIds.map((hubId) =>
        this.collectPrediction(
          hubId,
          shipment,
          route,
          hubById.get(hubId),
          weatherByHubId.get(hubId)
        ).catch((error) => {
          console.error(
            `[RiskAgent] Failed to get prediction for hub ${hubId}:`,
            error.message
          );
          return null;
        })
      )
    );

    return predictions.filter((p): p is RiskScoreData => p !== null);
  }

  async collectPrediction(
    hubId: number,
    shipment: any,
    route: any,
    hub?: { id: number; name: string } | null,
    weather?: { condition: string }
  ): Promise<RiskScoreData> {
    const resolvedHub =
      hub ??
      (await prisma.hub.findUnique({
        where: { id: hubId },
        select: { id: true, name: true },
      }));

    if (!resolvedHub) {
      throw new Error(`Hub not found: ${hubId}`);
    }

    const mlRequest: MLPredictionRequest = {
      origin_hub: shipment.originHub.name,
      destination_hub: shipment.destinationHub.name,
      distance_km: route?.baseDistanceKm || 500,
      duration_minutes: route?.baseDurationMinutes || 300,
      road_type: route?.roadType || 'highway',
      weather_condition: weather?.condition || 'Clear',
      traffic_level: 'moderate',
      shipment_priority: shipment.priority,
      weight_kg: parseFloat(shipment.weightKg?.toString() || '1000'),
      departure_hour: new Date().getHours(),
      day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      historical_delay_minutes: 15,
      current_risk_level: 'low',
      rerouted_before: false,
      destination_delay_rate: 0.1,
    };

    const prediction = await mlClientService.predict(mlRequest);

    const riskScore: RiskScoreData = {
      hubId,
      hubName: resolvedHub.name,
      predictedRisk: prediction.predicted_class as RiskLevel,
      confidence: prediction.confidence,
      delayProbability: this.calculateDelayProbability(
        prediction.predicted_class,
        prediction.confidence
      ),
      shapExplanation: {
        topFeatures: prediction.top_features,
        positiveContributors: prediction.positive_contributors,
        negativeContributors: prediction.negative_contributors,
        humanExplanation: prediction.human_explanation,
      },
      recommendation: this.generateRiskRecommendation(
        prediction.predicted_class as RiskLevel,
        prediction.confidence
      ),
      weatherCondition: weather?.condition,
    };

    return riskScore;
  }

  evaluateRisk(prediction: MLPredictionResponse): RiskScoreData {
    return {
      hubId: 0,
      hubName: 'Unknown',
      predictedRisk: prediction.predicted_class as RiskLevel,
      confidence: prediction.confidence,
      delayProbability: this.calculateDelayProbability(
        prediction.predicted_class,
        prediction.confidence
      ),
      shapExplanation: {
        topFeatures: prediction.top_features,
        positiveContributors: prediction.positive_contributors,
        negativeContributors: prediction.negative_contributors,
        humanExplanation: prediction.human_explanation,
      },
      recommendation: this.generateRiskRecommendation(
        prediction.predicted_class as RiskLevel,
        prediction.confidence
      ),
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

  private calculateDelayProbability(
    riskLevel: string,
    confidence: number
  ): number {
    const baseDelayProb: Record<string, number> = {
      low: 0.1,
      medium: 0.4,
      high: 0.7,
      critical: 0.9,
    };

    return baseDelayProb[riskLevel] || 0.5;
  }

  private aggregateRisk(
    riskScores: RiskScoreData[]
  ): RiskAgentResult['overallRisk'] {
    const criticalHubs: number[] = [];
    const highRiskHubs: number[] = [];
    const mediumRiskHubs: number[] = [];
    const lowRiskHubs: number[] = [];

    riskScores.forEach((score) => {
      switch (score.predictedRisk) {
        case 'critical':
          criticalHubs.push(score.hubId);
          break;
        case 'high':
          highRiskHubs.push(score.hubId);
          break;
        case 'medium':
          mediumRiskHubs.push(score.hubId);
          break;
        case 'low':
          lowRiskHubs.push(score.hubId);
          break;
      }
    });

    let highestRisk: RiskLevel = 'low';
    if (criticalHubs.length > 0) {
      highestRisk = 'critical';
    } else if (highRiskHubs.length > 0) {
      highestRisk = 'high';
    } else if (mediumRiskHubs.length > 0) {
      highestRisk = 'medium';
    }

    return {
      highestRisk,
      criticalHubs,
      highRiskHubs,
      mediumRiskHubs,
      lowRiskHubs,
    };
  }

  private generateRecommendations(
    riskScores: RiskScoreData[],
    context: ShipmentContext
  ): string[] {
    const recommendations: string[] = [];

    const criticalScores = riskScores.filter((s) => s.predictedRisk === 'critical');
    const highScores = riskScores.filter((s) => s.predictedRisk === 'high');

    if (criticalScores.length > 0) {
      recommendations.push(
        `CRITICAL RISK: ${criticalScores.length} hub(s) with critical delay risk. Immediate rerouting required.`
      );

      criticalScores.forEach((score) => {
        recommendations.push(
          `${score.hubName}: ${score.shapExplanation.humanExplanation}`
        );
      });
    }

    if (highScores.length > 0) {
      recommendations.push(
        `HIGH RISK: ${highScores.length} hub(s) with high delay probability. Route optimization recommended.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Risk levels are acceptable across all hubs.');
    }

    return recommendations;
  }

  private generateRiskRecommendation(
    riskLevel: RiskLevel,
    confidence: number
  ): string {
    const confidencePct = (confidence * 100).toFixed(1);

    switch (riskLevel) {
      case 'critical':
        return `CRITICAL (${confidencePct}% confidence): Severe delay risk. Immediate action required.`;
      case 'high':
        return `HIGH (${confidencePct}% confidence): Significant delay probability. Consider rerouting.`;
      case 'medium':
        return `MEDIUM (${confidencePct}% confidence): Moderate risk. Monitor situation.`;
      case 'low':
      default:
        return `LOW (${confidencePct}% confidence): Minimal risk. Proceed as planned.`;
    }
  }

  private calculateConfidence(riskScores: RiskScoreData[]): number {
    if (riskScores.length === 0) {
      return 0;
    }

    const avgConfidence =
      riskScores.reduce((sum, score) => sum + score.confidence, 0) /
      riskScores.length;

    return Math.round(avgConfidence * 100) / 100;
  }

  private async storeRiskScores(riskScores: RiskScoreData[]): Promise<void> {
    console.log(`[RiskAgent] Storing ${riskScores.length} risk scores`);

    try {
      if (riskScores.length === 0) {
        return;
      }

      await prisma.riskScore.createMany({
        data: riskScores.map((score) => ({
          hubId: score.hubId,
          delayProbability: score.delayProbability,
          riskLevel: score.predictedRisk,
          shapValues: score.shapExplanation.topFeatures,
          topRiskFactors: score.shapExplanation.positiveContributors,
          humanExplanation: score.shapExplanation.humanExplanation,
          modelVersion: 'v1.0',
        })),
      });

      console.log('[RiskAgent] Risk scores stored successfully');
    } catch (error: any) {
      console.error('[RiskAgent] Failed to store risk scores:', error.message);
    }
  }

  async generateResult(riskScores: RiskScoreData[]): Promise<RiskAgentResult> {
    const overallRisk = this.aggregateRisk(riskScores);
    const recommendations: string[] = [];
    const confidence = this.calculateConfidence(riskScores);

    return {
      success: true,
      hubsProcessed: riskScores.length,
      riskScores,
      overallRisk,
      recommendations,
      confidence,
      metadata: {
        executionTimeMs: 0,
        mlServiceAvailable: this.mlServiceAvailable,
        failedHubs: [],
        source: 'risk_agent',
      },
      errors: [],
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isMlServiceAvailable(): boolean {
    return this.mlServiceAvailable;
  }
}

export const riskAgent = new RiskAgent();
