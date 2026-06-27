import { prisma } from '../../lib/prisma';
import { GraphBuilder, Graph } from './graphBuilder';
import { dijkstra } from './dijkstra';
import type { RiskScore } from './weightCalculator';

export interface WeightedGraphContext {
  graph: Graph;
  riskScores: Map<number, RiskScore>;
}

export interface OptimalRouteResult {
  path: number[];
  pathNames: string[];
  totalWeight: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  riskFlags: {
    hubId: number;
    riskLevel: string;
  }[];
}

export interface RouteComparisonResult {
  pathChanged: boolean;
  oldPath: number[];
  newPath: number[];
  oldPathNames: string[];
  newPathNames: string[];
  reason?: string;
}

export interface RerouteResult {
  shipmentId: number;
  rerouted: boolean;
  routeChangeId?: number;
  oldRoute: number[];
  newRoute: number[];
  reason?: string;
}

export class RerouteService {
  async buildWeightedGraph() {
    const builder = new GraphBuilder();
    const { graph } = await builder.buildGraph();

    const latestRiskScores = await prisma.riskScore.findMany({
      where: {
        validUntil: {
          gte: new Date(),
        },
      },
      orderBy: {
        computedAt: 'desc',
      },
      distinct: ['hubId'],
    });

    const riskScoresMap = new Map<number, RiskScore>();
    for (const score of latestRiskScores) {
      riskScoresMap.set(score.hubId, {
        hubId: score.hubId,
        riskLevel: score.riskLevel.toUpperCase(),
        riskScore: Number(score.delayProbability),
        id: score.id,
      });
    }

    return {
      graph,
      riskScores: riskScoresMap,
    };
  }

  private async resolveRouteFromGraph(
    graph: Graph,
    originHubId: number,
    destinationHubId: number,
    riskScoresMap: Map<number, RiskScore>
  ): Promise<OptimalRouteResult> {
    const dijkstraResult = dijkstra(graph, originHubId, destinationHubId, {
      riskScores: riskScoresMap,
    });

    const hubs = await prisma.hub.findMany({
      where: {
        id: { in: dijkstraResult.path },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const hubMap = new Map(hubs.map((h) => [h.id, h.name]));
    const pathNames = dijkstraResult.path.map((id) => hubMap.get(id) || `Hub ${id}`);

    return {
      path: dijkstraResult.path,
      pathNames,
      totalWeight: dijkstraResult.totalWeight,
      totalDistanceKm: dijkstraResult.totalDistanceKm,
      totalDurationMinutes: dijkstraResult.totalDurationMinutes,
      riskFlags: dijkstraResult.riskFlags,
    };
  }

  async calculateOptimalRoute(
    originHubId: number,
    destinationHubId: number,
    riskScores?: Map<number, RiskScore>,
    graph?: Graph
  ): Promise<OptimalRouteResult> {
    if (graph && riskScores) {
      return this.resolveRouteFromGraph(graph, originHubId, destinationHubId, riskScores);
    }

    const weighted = await this.buildWeightedGraph();
    const resolvedGraph = graph ?? weighted.graph;
    const riskScoresMap = riskScores ?? weighted.riskScores;

    return this.resolveRouteFromGraph(
      resolvedGraph,
      originHubId,
      destinationHubId,
      riskScoresMap
    );
  }

  compareRoutes(oldRoute: number[], newRoute: number[]): RouteComparisonResult {
    const oldPathStr = oldRoute.join(',');
    const newPathStr = newRoute.join(',');
    const pathChanged = oldPathStr !== newPathStr;

    return {
      pathChanged,
      oldPath: oldRoute,
      newPath: newRoute,
      oldPathNames: [],
      newPathNames: [],
    };
  }

  async checkAndRerouteShipment(
    shipmentId: number,
    prebuilt?: WeightedGraphContext
  ): Promise<RerouteResult> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        originHub: { select: { id: true, name: true } },
        destinationHub: { select: { id: true, name: true } },
        currentHub: { select: { id: true, name: true } },
      },
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    if (!shipment.currentHub) {
      return {
        shipmentId,
        rerouted: false,
        oldRoute: shipment.activeRoute as number[],
        newRoute: shipment.activeRoute as number[],
        reason: 'Shipment has no current hub',
      };
    }

    if (shipment.status === 'delivered') {
      return {
        shipmentId,
        rerouted: false,
        oldRoute: shipment.activeRoute as number[],
        newRoute: shipment.activeRoute as number[],
        reason: 'Shipment already delivered',
      };
    }

    const { graph, riskScores } = prebuilt ?? (await this.buildWeightedGraph());

    let newRoute: OptimalRouteResult;
    try {
      newRoute = await this.calculateOptimalRoute(
        shipment.currentHub.id,
        shipment.destinationHubId,
        riskScores,
        graph
      );
    } catch (error) {
      return {
        shipmentId,
        rerouted: false,
        oldRoute: shipment.activeRoute as number[],
        newRoute: shipment.activeRoute as number[],
        reason: `Unable to calculate route: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    const oldRoute = shipment.activeRoute as number[];
    const currentHubIndex = oldRoute.indexOf(shipment.currentHub.id);
    const oldRouteFromCurrent = oldRoute.slice(currentHubIndex);

    const comparison = this.compareRoutes(oldRouteFromCurrent, newRoute.path);

    if (!comparison.pathChanged) {
      return {
        shipmentId,
        rerouted: false,
        oldRoute,
        newRoute: oldRoute,
        reason: 'No better route found',
      };
    }

    const fullNewRoute = [
      ...oldRoute.slice(0, currentHubIndex),
      ...newRoute.path,
    ];

    const oldRouteNames = shipment.activeRouteNames as string[];

    const fullNewRouteNames = [
      ...oldRouteNames.slice(0, currentHubIndex),
      ...newRoute.pathNames,
    ];

    const triggeredByRisk = newRoute.riskFlags.find((flag) =>
      oldRouteFromCurrent.includes(flag.hubId)
    );

    const triggeredByRiskScoreId = triggeredByRisk
      ? riskScores.get(triggeredByRisk.hubId)?.id ?? null
      : null;

    let reason = 'Route optimization based on current conditions';
    if (triggeredByRisk) {
      const hubName =
        newRoute.pathNames[newRoute.path.indexOf(triggeredByRisk.hubId)] ||
        `Hub ${triggeredByRisk.hubId}`;
      reason = `${triggeredByRisk.riskLevel} risk detected at ${hubName}. Rerouting to avoid delays.`;
    }

    const routeChange = await prisma.routeChange.create({
      data: {
        shipmentId,
        oldRoute: oldRoute,
        newRoute: fullNewRoute,
        oldRouteNames: oldRouteNames,
        newRouteNames: fullNewRouteNames,
        reason,
        riskLevelTriggered: triggeredByRisk?.riskLevel.toLowerCase() || null,
        triggeredByHubId: triggeredByRisk?.hubId || null,
        triggeredByRiskScoreId: triggeredByRiskScoreId,
        agentDecisionLog: null,
        webhookFired: false,
      },
    });

    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        activeRoute: fullNewRoute,
        activeRouteNames: fullNewRouteNames,
        status: 'rerouted',
        updatedAt: new Date(),
      },
    });

    return {
      shipmentId,
      rerouted: true,
      routeChangeId: routeChange.id,
      oldRoute,
      newRoute: fullNewRoute,
      reason,
    };
  }

  async checkAndRerouteAllShipments(): Promise<RerouteResult[]> {
    const shipments = await prisma.shipment.findMany({
      where: {
        status: {
          in: ['pending', 'in_transit', 'at_risk'],
        },
      },
      select: { id: true },
    });

    const results: RerouteResult[] = [];
    const prebuilt = await this.buildWeightedGraph();

    for (const shipment of shipments) {
      try {
        const result = await this.checkAndRerouteShipment(shipment.id, prebuilt);
        results.push(result);
      } catch (error) {
        console.error(`Error rerouting shipment ${shipment.id}:`, error);
        results.push({
          shipmentId: shipment.id,
          rerouted: false,
          oldRoute: [],
          newRoute: [],
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return results;
  }

  async updateShipmentRoute(
    shipmentId: number,
    newRoute: number[],
    newRouteNames: string[],
    reason: string
  ): Promise<void> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        activeRoute: newRoute,
        activeRouteNames: newRouteNames,
        status: 'rerouted',
        updatedAt: new Date(),
      },
    });
  }
}

export const rerouteService = new RerouteService();
