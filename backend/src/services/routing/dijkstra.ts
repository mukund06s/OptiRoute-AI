import { Graph, Edge } from './graphBuilder';
import { PriorityQueue } from './PriorityQueue';

export interface DijkstraResult {
  path: number[];
  totalWeight: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  riskFlags: {
    hubId: number;
    riskLevel: string;
  }[];
  visitedNodes: number;
}

export interface RiskScore {
  hubId: number;
  riskLevel: string;
  riskScore: number;
}

export interface DijkstraOptions {
  riskScores?: Map<number, RiskScore>;
}

function calculateEdgeWeight(edge: Edge, options?: DijkstraOptions): number {
  const baseWeight = edge.baseDistanceKm + edge.baseDurationMinutes * 0.5;

  if (!options?.riskScores) {
    return baseWeight;
  }

  const riskScore = options.riskScores.get(edge.destinationHubId);
  if (!riskScore) {
    return baseWeight;
  }

  const riskMultiplier = getRiskMultiplier(riskScore.riskLevel);
  return baseWeight * riskMultiplier;
}

function getRiskMultiplier(riskLevel: string): number {
  switch (riskLevel.toUpperCase()) {
    case 'CRITICAL':
      return 3.0;
    case 'HIGH':
      return 2.0;
    case 'MEDIUM':
      return 1.5;
    case 'LOW':
      return 1.0;
    default:
      return 1.0;
  }
}

export function dijkstra(
  graph: Graph,
  startHubId: number,
  endHubId: number,
  options?: DijkstraOptions
): DijkstraResult {
  if (!graph || graph.size === 0) {
    throw new Error('Graph is empty');
  }

  if (!graph.has(startHubId)) {
    throw new Error(`Start node ${startHubId} not found in graph`);
  }

  if (!graph.has(endHubId)) {
    throw new Error(`End node ${endHubId} not found in graph`);
  }

  if (startHubId === endHubId) {
    return {
      path: [startHubId],
      totalWeight: 0,
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      riskFlags: [],
      visitedNodes: 1,
    };
  }

  const distances = new Map<number, number>();
  const previous = new Map<number, { hubId: number; edge: Edge } | null>();
  const visited = new Set<number>();
  const pq = new PriorityQueue<number>();

  for (const nodeId of graph.keys()) {
    distances.set(nodeId, Infinity);
    previous.set(nodeId, null);
  }

  distances.set(startHubId, 0);
  pq.insert(startHubId, 0);

  let visitedNodes = 0;

  while (!pq.isEmpty()) {
    const currentHub = pq.extractMin();

    if (currentHub === undefined) {
      break;
    }

    if (visited.has(currentHub)) {
      continue;
    }

    visited.add(currentHub);
    visitedNodes++;

    if (currentHub === endHubId) {
      break;
    }

    const currentDistance = distances.get(currentHub);
    if (currentDistance === undefined || currentDistance === Infinity) {
      continue;
    }

    const neighbors = graph.get(currentHub);
    if (!neighbors) {
      continue;
    }

    for (const edge of neighbors) {
      const neighborId = edge.destinationHubId;

      if (visited.has(neighborId)) {
        continue;
      }

      const edgeWeight = calculateEdgeWeight(edge, options);
      const newDistance = currentDistance + edgeWeight;
      const oldDistance = distances.get(neighborId) ?? Infinity;

      if (newDistance < oldDistance) {
        distances.set(neighborId, newDistance);
        previous.set(neighborId, { hubId: currentHub, edge });

        if (pq.contains(neighborId)) {
          pq.decreaseKey(neighborId, newDistance);
        } else {
          pq.insert(neighborId, newDistance);
        }
      }
    }
  }

  const finalDistance = distances.get(endHubId);
  if (finalDistance === undefined || finalDistance === Infinity) {
    throw new Error(`No path found from ${startHubId} to ${endHubId}`);
  }

  const path: number[] = [];
  const riskFlags: { hubId: number; riskLevel: string }[] = [];
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;

  let current: number | null = endHubId;
  while (current !== null) {
    path.unshift(current);

    const riskScore = options?.riskScores?.get(current);
    if (riskScore && (riskScore.riskLevel === 'HIGH' || riskScore.riskLevel === 'CRITICAL')) {
      riskFlags.push({
        hubId: current,
        riskLevel: riskScore.riskLevel,
      });
    }

    const prevNode = previous.get(current);
    if (!prevNode) {
      break;
    }

    const { edge } = prevNode;
    totalDistanceKm += edge.baseDistanceKm;
    totalDurationMinutes += edge.baseDurationMinutes;

    current = prevNode.hubId;
  }

  return {
    path,
    totalWeight: finalDistance,
    totalDistanceKm,
    totalDurationMinutes,
    riskFlags,
    visitedNodes,
  };
}
