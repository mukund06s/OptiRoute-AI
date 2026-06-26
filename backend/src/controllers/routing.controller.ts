import { Request, Response } from 'express';
import { rerouteService } from '../services/routing/rerouteService';
import { GraphBuilder } from '../services/routing/graphBuilder';

class RoutingController {
  async calculateRoute(req: Request, res: Response): Promise<void> {
    try {
      const { originHubId, destinationHubId } = req.body;

      const result = await rerouteService.calculateOptimalRoute(originHubId, destinationHubId);

      res.status(200).json({
        path: result.path,
        hubNames: result.pathNames,
        distanceKm: result.totalDistanceKm,
        durationMinutes: result.totalDurationMinutes,
        totalWeight: result.totalWeight,
        riskFlags: result.riskFlags,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found in graph')) {
        res.status(404).json({
          error: 'Hub not found',
          message: error.message,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('No path found')) {
        res.status(404).json({
          error: 'No path found',
          message: error.message,
        });
        return;
      }

      console.error('Error calculating route:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to calculate route',
      });
    }
  }

  async rerouteShipment(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId } = req.params;

      const result = await rerouteService.checkAndRerouteShipment(Number(shipmentId));

      res.status(200).json({
        shipmentId: result.shipmentId,
        rerouted: result.rerouted,
        oldRoute: result.oldRoute,
        newRoute: result.newRoute,
        reason: result.reason,
        routeChangeId: result.routeChangeId,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Shipment not found',
          message: error.message,
        });
        return;
      }

      console.error('Error rerouting shipment:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reroute shipment',
      });
    }
  }

  async rerouteAll(req: Request, res: Response): Promise<void> {
    try {
      const results = await rerouteService.checkAndRerouteAllShipments();

      const processed = results.length;
      const rerouted = results.filter((r) => r.rerouted).length;
      const failed = results.filter((r) => r.reason?.includes('Error')).length;

      res.status(200).json({
        processed,
        rerouted,
        failed,
        results: results.map((r) => ({
          shipmentId: r.shipmentId,
          rerouted: r.rerouted,
          reason: r.reason,
        })),
      });
    } catch (error) {
      console.error('Error rerouting all shipments:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reroute shipments',
      });
    }
  }

  async getGraphState(req: Request, res: Response): Promise<void> {
    try {
      const builder = new GraphBuilder();
      const { graph, nodeCount, edgeCount } = await builder.buildGraph();

      const { riskScores } = await rerouteService.buildWeightedGraph();

      res.status(200).json({
        nodeCount,
        edgeCount,
        activeRiskScores: riskScores.size,
        lastGraphBuildTime: new Date().toISOString(),
        nodes: Array.from(graph.keys()),
      });
    } catch (error) {
      console.error('Error getting graph state:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get graph state',
      });
    }
  }
}

export const routingController = new RoutingController();
