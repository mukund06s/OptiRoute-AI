import { Edge, WeightedEdge } from './graphBuilder';

export interface RiskScore {
  hubId: number;
  riskLevel: string;
  riskScore: number;
  id?: number;
}

const DISTANCE_FACTOR = 1.0;
const TIME_FACTOR = 0.5;

const RISK_MULTIPLIERS: Record<string, number> = {
  LOW: 1.0,
  MEDIUM: 1.5,
  HIGH: 3.0,
  CRITICAL: 10.0,
};

export function calculateBaseWeight(edge: Edge): number {
  return edge.baseDistanceKm * DISTANCE_FACTOR + edge.baseDurationMinutes * TIME_FACTOR;
}

export function calculateRiskMultiplier(riskLevel: string): number {
  const normalizedLevel = riskLevel.toUpperCase();
  return RISK_MULTIPLIERS[normalizedLevel] ?? RISK_MULTIPLIERS.LOW;
}

export function calculateCompositeWeight(
  baseWeight: number,
  riskMultiplier: number
): number {
  return baseWeight * riskMultiplier;
}

export function calculateWeightedEdge(
  edge: Edge,
  riskScore: RiskScore | null | undefined
): WeightedEdge {
  const baseWeight = calculateBaseWeight(edge);
  const riskLevel = riskScore?.riskLevel ?? 'LOW';
  const riskMultiplier = calculateRiskMultiplier(riskLevel);
  const compositeWeight = calculateCompositeWeight(baseWeight, riskMultiplier);
  const riskPenalty = compositeWeight - baseWeight;

  return {
    ...edge,
    compositeWeight,
    riskPenalty,
    destinationRiskLevel: riskLevel,
  };
}

export function calculateWeightedGraph(
  graph: Map<number, Edge[]>,
  riskScores?: Map<number, RiskScore>
): Map<number, WeightedEdge[]> {
  const weightedGraph = new Map<number, WeightedEdge[]>();

  for (const [hubId, edges] of graph.entries()) {
    const weightedEdges = edges.map((edge) => {
      const destinationRiskScore = riskScores?.get(edge.destinationHubId);
      return calculateWeightedEdge(edge, destinationRiskScore);
    });

    weightedGraph.set(hubId, weightedEdges);
  }

  return weightedGraph;
}

export function getEdgeWeight(
  edge: Edge,
  riskScores?: Map<number, RiskScore>
): number {
  const baseWeight = calculateBaseWeight(edge);
  const riskLevel = riskScores?.get(edge.destinationHubId)?.riskLevel ?? 'LOW';
  const riskMultiplier = calculateRiskMultiplier(riskLevel);
  return calculateCompositeWeight(baseWeight, riskMultiplier);
}
