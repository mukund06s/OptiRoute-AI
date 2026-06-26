import { prisma } from '../../lib/prisma';

export interface Edge {
  destinationHubId: number;
  baseDistanceKm: number;
  baseDurationMinutes: number;
  routeId: number;
  roadType?: string;
}

export interface WeightedEdge extends Edge {
  compositeWeight: number;
  riskPenalty: number;
  destinationRiskLevel: string;
}

export type Graph = Map<number, Edge[]>;

export interface GraphResult {
  graph: Graph;
  nodeCount: number;
  edgeCount: number;
  nodes: number[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  activeNodes: number;
  activeEdges: number;
  isolatedNodes: number[];
}

export class GraphBuilder {
  private graph: Graph;
  private nodeSet: Set<number>;

  constructor() {
    this.graph = new Map();
    this.nodeSet = new Set();
  }

  async buildGraph(): Promise<GraphResult> {
    try {
      const [hubs, routes] = await Promise.all([
        prisma.hub.findMany({
          where: { isActive: true },
          select: { id: true },
        }),
        prisma.route.findMany({
          where: { isActive: true },
          select: {
            id: true,
            originHubId: true,
            destinationHubId: true,
            baseDistanceKm: true,
            baseDurationMinutes: true,
            roadType: true,
          },
        }),
      ]);

      this.graph.clear();
      this.nodeSet.clear();

      for (const hub of hubs) {
        this.nodeSet.add(hub.id);
        if (!this.graph.has(hub.id)) {
          this.graph.set(hub.id, []);
        }
      }

      let validEdgeCount = 0;

      for (const route of routes) {
        if (!this.nodeSet.has(route.originHubId)) {
          continue;
        }

        if (!this.nodeSet.has(route.destinationHubId)) {
          continue;
        }

        const edge: Edge = {
          destinationHubId: route.destinationHubId,
          baseDistanceKm: Number(route.baseDistanceKm),
          baseDurationMinutes: route.baseDurationMinutes,
          routeId: route.id,
          roadType: route.roadType || undefined,
        };

        const edges = this.graph.get(route.originHubId);
        if (edges) {
          edges.push(edge);
          validEdgeCount++;
        }
      }

      return {
        graph: this.graph,
        nodeCount: this.nodeSet.size,
        edgeCount: validEdgeCount,
        nodes: Array.from(this.nodeSet),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to build graph: ${error.message}`);
      }
      throw new Error('Failed to build graph: Unknown error');
    }
  }

  getNeighbors(hubId: number): Edge[] {
    if (!this.hasNode(hubId)) {
      return [];
    }

    return this.graph.get(hubId) || [];
  }

  hasNode(hubId: number): boolean {
    return this.nodeSet.has(hubId);
  }

  hasEdge(originHubId: number, destinationHubId: number): boolean {
    const edges = this.graph.get(originHubId);
    if (!edges) {
      return false;
    }

    return edges.some((edge) => edge.destinationHubId === destinationHubId);
  }

  getNodeCount(): number {
    return this.nodeSet.size;
  }

  getEdgeCount(): number {
    let count = 0;
    for (const edges of this.graph.values()) {
      count += edges.length;
    }
    return count;
  }

  getAllNodes(): number[] {
    return Array.from(this.nodeSet);
  }

  getGraph(): Graph {
    return this.graph;
  }

  getStats(): GraphStats {
    const isolatedNodes: number[] = [];

    for (const nodeId of this.nodeSet) {
      const outgoingEdges = this.graph.get(nodeId) || [];
      const hasIncoming = Array.from(this.graph.values()).some((edges) =>
        edges.some((edge) => edge.destinationHubId === nodeId)
      );

      if (outgoingEdges.length === 0 && !hasIncoming) {
        isolatedNodes.push(nodeId);
      }
    }

    return {
      totalNodes: this.nodeSet.size,
      totalEdges: this.getEdgeCount(),
      activeNodes: this.nodeSet.size - isolatedNodes.length,
      activeEdges: this.getEdgeCount(),
      isolatedNodes,
    };
  }

  validateGraph(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.nodeSet.size === 0) {
      errors.push('Graph has no nodes');
    }

    if (this.getEdgeCount() === 0) {
      errors.push('Graph has no edges');
    }

    for (const [originId, edges] of this.graph.entries()) {
      if (!this.nodeSet.has(originId)) {
        errors.push(`Origin hub ${originId} not found in node set`);
      }

      for (const edge of edges) {
        if (!this.nodeSet.has(edge.destinationHubId)) {
          errors.push(
            `Destination hub ${edge.destinationHubId} for route ${edge.routeId} not found in node set`
          );
        }

        if (edge.baseDistanceKm <= 0) {
          errors.push(`Route ${edge.routeId} has invalid distance: ${edge.baseDistanceKm}`);
        }

        if (edge.baseDurationMinutes <= 0) {
          errors.push(`Route ${edge.routeId} has invalid duration: ${edge.baseDurationMinutes}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  findPath(originHubId: number, destinationHubId: number): number[] | null {
    if (!this.hasNode(originHubId) || !this.hasNode(destinationHubId)) {
      return null;
    }

    if (originHubId === destinationHubId) {
      return [originHubId];
    }

    const visited = new Set<number>();
    const queue: Array<{ hubId: number; path: number[] }> = [
      { hubId: originHubId, path: [originHubId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current.hubId === destinationHubId) {
        return current.path;
      }

      if (visited.has(current.hubId)) {
        continue;
      }

      visited.add(current.hubId);

      const neighbors = this.getNeighbors(current.hubId);
      for (const edge of neighbors) {
        if (!visited.has(edge.destinationHubId)) {
          queue.push({
            hubId: edge.destinationHubId,
            path: [...current.path, edge.destinationHubId],
          });
        }
      }
    }

    return null;
  }
}

export async function buildGraphFromDatabase(): Promise<GraphResult> {
  const builder = new GraphBuilder();
  return await builder.buildGraph();
}
