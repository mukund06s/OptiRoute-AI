/**
 * Routing Agent - Coordinates Routing Decisions
 * Reuses RerouteService for all routing business logic
 */

import { prisma } from '../../lib/prisma';
import { rerouteService, RerouteResult } from '../routing/rerouteService';
import { RiskAgentResult } from './riskAgent';
import { AgentStep } from './supervisorAgent';

export interface ShipmentContext {
  shipmentId: number;
  trackingId: string;
  currentHubId: number | null;
  destinationHubId: number;
  activeRoute: number[];
  priority: string;
}

export interface RoutingAgentResult {
  success: boolean;
  shipmentsProcessed: number;
  routeChanges: RouteChangeData[];
  summary: {
    totalRerouted: number;
    totalUnchanged: number;
    totalFailed: number;
  };
  recommendations: string[];
  metadata: {
    executionTimeMs: number;
    routingEngineAvailable: boolean;
    failedShipments: number[];
    source: string;
  };
  errors: string[];
}

export interface RouteChangeData {
  shipmentId: number;
  trackingId: string;
  rerouted: boolean;
  oldRoute: number[];
  newRoute: number[];
  oldRouteNames: string[];
  newRouteNames: string[];
  routeDifference: {
    hubsAdded: number[];
    hubsRemoved: number[];
    sequenceChanged: boolean;
  };
  reason: string;
  estimatedTimeSaved?: number;
  estimatedDistanceChange?: number;
  routeChangeId?: number;
}

export class RoutingAgent {
  private initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async initialize(): Promise<boolean> {
    console.log('[RoutingAgent] Initializing...');
    this.initialized = true;
    console.log('[RoutingAgent] Initialized successfully');
    return true;
  }

  async execute(
    context: ShipmentContext,
    step: AgentStep,
    riskResult?: RiskAgentResult
  ): Promise<RoutingAgentResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    console.log(`[RoutingAgent] Executing for shipment ${context.trackingId}`);

    try {
      const requiresReroute = await this.evaluateReroute(context, riskResult);

      if (!requiresReroute) {
        console.log('[RoutingAgent] No reroute required');
        return {
          success: true,
          shipmentsProcessed: 0,
          routeChanges: [],
          summary: {
            totalRerouted: 0,
            totalUnchanged: 1,
            totalFailed: 0,
          },
          recommendations: ['Current route is optimal. No changes required.'],
          metadata: {
            executionTimeMs: Date.now() - startTime,
            routingEngineAvailable: true,
            failedShipments: [],
            source: 'routing_agent',
          },
          errors: [],
        };
      }

      const routeChange = await this.applyReroute(context, riskResult);

      const recommendations = this.generateRecommendations([routeChange], context);

      const executionTimeMs = Date.now() - startTime;

      const result: RoutingAgentResult = {
        success: true,
        shipmentsProcessed: 1,
        routeChanges: [routeChange],
        summary: {
          totalRerouted: routeChange.rerouted ? 1 : 0,
          totalUnchanged: routeChange.rerouted ? 0 : 1,
          totalFailed: 0,
        },
        recommendations,
        metadata: {
          executionTimeMs,
          routingEngineAvailable: true,
          failedShipments: [],
          source: 'routing_agent',
        },
        errors: [],
      };

      console.log(
        `[RoutingAgent] Completed: ${routeChange.rerouted ? 'Rerouted' : 'No change'} in ${executionTimeMs}ms`
      );

      return result;
    } catch (error: any) {
      console.error('[RoutingAgent] Execution failed:', error.message);

      return {
        success: false,
        shipmentsProcessed: 0,
        routeChanges: [],
        summary: {
          totalRerouted: 0,
          totalUnchanged: 0,
          totalFailed: 1,
        },
        recommendations: ['Routing operation failed. Manual review required.'],
        metadata: {
          executionTimeMs: Date.now() - startTime,
          routingEngineAvailable: false,
          failedShipments: [context.shipmentId],
          source: 'error',
        },
        errors: [error.message],
      };
    }
  }

  async analyzeCurrentRoute(context: ShipmentContext): Promise<{
    hasRoute: boolean;
    routeLength: number;
    currentHubPosition: number;
    destination: number;
  }> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: context.shipmentId },
    });

    if (!shipment) {
      throw new Error(`Shipment not found: ${context.shipmentId}`);
    }

    const activeRoute = (shipment.activeRoute as any) || [];
    const currentHubPosition = context.currentHubId
      ? activeRoute.indexOf(context.currentHubId)
      : 0;

    return {
      hasRoute: activeRoute.length > 0,
      routeLength: activeRoute.length,
      currentHubPosition,
      destination: context.destinationHubId,
    };
  }

  async evaluateReroute(
    context: ShipmentContext,
    riskResult?: RiskAgentResult
  ): Promise<boolean> {
    if (!riskResult) {
      console.log('[RoutingAgent] No risk data available, skipping reroute');
      return false;
    }

    if (!riskResult.success) {
      console.log('[RoutingAgent] Risk assessment failed, skipping reroute');
      return false;
    }

    const highestRisk = riskResult.overallRisk.highestRisk;

    if (highestRisk === 'critical' || highestRisk === 'high') {
      console.log(
        `[RoutingAgent] ${highestRisk.toUpperCase()} risk detected, reroute required`
      );
      return true;
    }

    console.log(
      `[RoutingAgent] Risk level ${highestRisk} is acceptable, no reroute needed`
    );
    return false;
  }

  async applyReroute(
    context: ShipmentContext,
    riskResult?: RiskAgentResult
  ): Promise<RouteChangeData> {
    console.log(`[RoutingAgent] Applying reroute for shipment ${context.shipmentId}`);

    const rerouteResult: RerouteResult = await rerouteService.checkAndRerouteShipment(
      context.shipmentId
    );

    const shipment = await prisma.shipment.findUnique({
      where: { id: context.shipmentId },
    });

    const oldRouteNames = (shipment?.plannedRouteNames as any) || [];
    const newRouteNames = (shipment?.activeRouteNames as any) || [];

    const routeDifference = this.calculateRouteDifference(
      rerouteResult.oldRoute,
      rerouteResult.newRoute
    );

    const estimatedTimeSaved = this.estimateTimeSavings(
      rerouteResult.oldRoute,
      rerouteResult.newRoute
    );

    const estimatedDistanceChange = this.estimateDistanceChange(
      rerouteResult.oldRoute,
      rerouteResult.newRoute
    );

    const routeChange: RouteChangeData = {
      shipmentId: context.shipmentId,
      trackingId: context.trackingId,
      rerouted: rerouteResult.rerouted,
      oldRoute: rerouteResult.oldRoute,
      newRoute: rerouteResult.newRoute,
      oldRouteNames,
      newRouteNames,
      routeDifference,
      reason: rerouteResult.reason || 'Risk-based rerouting',
      estimatedTimeSaved,
      estimatedDistanceChange,
      routeChangeId: rerouteResult.routeChangeId,
    };

    return routeChange;
  }

  private calculateRouteDifference(
    oldRoute: number[],
    newRoute: number[]
  ): RouteChangeData['routeDifference'] {
    const oldSet = new Set(oldRoute);
    const newSet = new Set(newRoute);

    const hubsAdded = newRoute.filter((hubId) => !oldSet.has(hubId));
    const hubsRemoved = oldRoute.filter((hubId) => !newSet.has(hubId));

    const sequenceChanged = oldRoute.join(',') !== newRoute.join(',');

    return {
      hubsAdded,
      hubsRemoved,
      sequenceChanged,
    };
  }

  private estimateTimeSavings(oldRoute: number[], newRoute: number[]): number {
    const lengthDifference = oldRoute.length - newRoute.length;
    return lengthDifference * 30;
  }

  private estimateDistanceChange(oldRoute: number[], newRoute: number[]): number {
    const lengthDifference = oldRoute.length - newRoute.length;
    return lengthDifference * -100;
  }

  private generateRecommendations(
    routeChanges: RouteChangeData[],
    context: ShipmentContext
  ): string[] {
    const recommendations: string[] = [];

    const rerouted = routeChanges.filter((rc) => rc.rerouted);
    const unchanged = routeChanges.filter((rc) => !rc.rerouted);

    if (rerouted.length > 0) {
      recommendations.push(
        `${rerouted.length} shipment(s) rerouted successfully to avoid high-risk areas.`
      );

      rerouted.forEach((rc) => {
        if (rc.estimatedTimeSaved && rc.estimatedTimeSaved > 0) {
          recommendations.push(
            `${rc.trackingId}: Estimated time saved: ${rc.estimatedTimeSaved} minutes`
          );
        }

        if (rc.routeDifference.hubsRemoved.length > 0) {
          recommendations.push(
            `${rc.trackingId}: Avoiding ${rc.routeDifference.hubsRemoved.length} high-risk hub(s)`
          );
        }
      });
    }

    if (unchanged.length > 0 && rerouted.length === 0) {
      recommendations.push('Current route remains optimal despite risk factors.');
    }

    return recommendations;
  }

  async generateResult(
    routeChanges: RouteChangeData[]
  ): Promise<RoutingAgentResult> {
    const totalRerouted = routeChanges.filter((rc) => rc.rerouted).length;
    const totalUnchanged = routeChanges.filter((rc) => !rc.rerouted).length;

    return {
      success: true,
      shipmentsProcessed: routeChanges.length,
      routeChanges,
      summary: {
        totalRerouted,
        totalUnchanged,
        totalFailed: 0,
      },
      recommendations: [],
      metadata: {
        executionTimeMs: 0,
        routingEngineAvailable: true,
        failedShipments: [],
        source: 'routing_agent',
      },
      errors: [],
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const routingAgent = new RoutingAgent();
