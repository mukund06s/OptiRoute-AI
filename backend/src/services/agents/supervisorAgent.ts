/**
 * Supervisor Agent - Orchestration Planning Only
 * Determines which agents need to run and creates execution plans
 * Does NOT execute business logic from individual agents
 */

import { prisma } from '../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export type AgentType = 'weather' | 'risk' | 'routing' | 'communication';

export type ExecutionState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface AgentStep {
  agent: AgentType;
  state: ExecutionState;
  requiredData?: string[];
  outputData?: string[];
  condition?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionPlan {
  planId: string;
  cycleId: string;
  shipmentId?: number;
  createdAt: Date;
  updatedAt: Date;
  state: ExecutionState;
  steps: AgentStep[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  errors: string[];
  metadata: Record<string, any>;
}

export interface WorkflowDecision {
  requiresWeather: boolean;
  requiresRisk: boolean;
  requiresRouting: boolean;
  requiresCommunication: boolean;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ShipmentEvaluation {
  shipmentId: number;
  trackingId: string;
  status: string;
  currentHubId: number | null;
  destinationHubId: number;
  activeRoute: number[];
  needsEvaluation: boolean;
  riskFactors: string[];
  lastRiskCheck?: Date;
  inTransit: boolean;
}

export class SupervisorAgent {
  private activePlans: Map<string, ExecutionPlan>;
  private cycleId: string;

  constructor() {
    this.activePlans = new Map();
    this.cycleId = '';
  }

  async initialize(cycleId?: string): Promise<string> {
    this.cycleId = cycleId || uuidv4();
    this.activePlans.clear();

    console.log(`[SupervisorAgent] Initialized with cycleId: ${this.cycleId}`);

    return this.cycleId;
  }

  async evaluateShipment(shipmentId: number): Promise<ShipmentEvaluation> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        currentHub: true,
        destinationHub: true,
      },
    });

    if (!shipment) {
      throw new Error(`Shipment not found: ${shipmentId}`);
    }

    const activeRoute = (shipment.activeRoute as any) || [];
    const inTransit = shipment.status === 'in_transit' || shipment.status === 'pending';

    const riskFactors: string[] = [];
    let needsEvaluation = false;

    if (inTransit && activeRoute.length > 0) {
      needsEvaluation = true;
      riskFactors.push('shipment_in_transit');
    }

    const latestRiskCheck = await prisma.riskScore.findFirst({
      where: {
        hubId: shipment.currentHubId || shipment.originHubId,
      },
      orderBy: { computedAt: 'desc' },
    });

    if (latestRiskCheck) {
      const ageMinutes =
        (Date.now() - latestRiskCheck.computedAt.getTime()) / (1000 * 60);

      if (ageMinutes > 30) {
        riskFactors.push('stale_risk_data');
        needsEvaluation = true;
      }

      if (
        latestRiskCheck.riskLevel === 'high' ||
        latestRiskCheck.riskLevel === 'critical'
      ) {
        riskFactors.push(`hub_risk_${latestRiskCheck.riskLevel}`);
        needsEvaluation = true;
      }
    } else {
      riskFactors.push('no_risk_data');
      needsEvaluation = true;
    }

    return {
      shipmentId: shipment.id,
      trackingId: shipment.trackingId,
      status: shipment.status,
      currentHubId: shipment.currentHubId,
      destinationHubId: shipment.destinationHubId,
      activeRoute,
      needsEvaluation,
      riskFactors,
      lastRiskCheck: latestRiskCheck?.computedAt,
      inTransit,
    };
  }

  async determineWorkflow(
    evaluation: ShipmentEvaluation
  ): Promise<WorkflowDecision> {
    let requiresWeather = false;
    let requiresRisk = false;
    let requiresRouting = false;
    let requiresCommunication = false;
    let reason = '';
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (!evaluation.needsEvaluation) {
      return {
        requiresWeather: false,
        requiresRisk: false,
        requiresRouting: false,
        requiresCommunication: false,
        reason: 'Shipment does not require evaluation',
        priority: 'low',
      };
    }

    if (!evaluation.inTransit) {
      return {
        requiresWeather: false,
        requiresRisk: false,
        requiresRouting: false,
        requiresCommunication: false,
        reason: 'Shipment not in transit',
        priority: 'low',
      };
    }

    if (evaluation.riskFactors.includes('no_risk_data')) {
      requiresWeather = true;
      requiresRisk = true;
      reason = 'No risk data available, full evaluation required';
      priority = 'medium';
    } else if (evaluation.riskFactors.includes('stale_risk_data')) {
      requiresWeather = true;
      requiresRisk = true;
      reason = 'Risk data is stale (>30 minutes), refresh required';
      priority = 'medium';
    }

    if (evaluation.riskFactors.includes('hub_risk_high')) {
      requiresWeather = true;
      requiresRisk = true;
      requiresRouting = true;
      requiresCommunication = true;
      reason = 'High risk detected on route, rerouting required';
      priority = 'high';
    } else if (evaluation.riskFactors.includes('hub_risk_critical')) {
      requiresWeather = true;
      requiresRisk = true;
      requiresRouting = true;
      requiresCommunication = true;
      reason = 'Critical risk detected on route, immediate rerouting required';
      priority = 'critical';
    }

    if (evaluation.riskFactors.includes('shipment_in_transit') && !requiresRisk) {
      requiresWeather = true;
      requiresRisk = true;
      reason = 'In-transit shipment requires periodic risk assessment';
      priority = 'medium';
    }

    return {
      requiresWeather,
      requiresRisk,
      requiresRouting,
      requiresCommunication,
      reason,
      priority,
    };
  }

  async createExecutionPlan(
    workflow: WorkflowDecision,
    shipmentId?: number
  ): Promise<ExecutionPlan> {
    const planId = uuidv4();
    const steps: AgentStep[] = [];

    if (workflow.requiresWeather) {
      steps.push({
        agent: 'weather',
        state: 'pending',
        requiredData: [],
        outputData: ['weatherResults'],
        retryCount: 0,
        maxRetries: 3,
        metadata: {
          priority: workflow.priority,
        },
      });
    }

    if (workflow.requiresRisk) {
      steps.push({
        agent: 'risk',
        state: 'pending',
        requiredData: workflow.requiresWeather ? ['weatherResults'] : [],
        outputData: ['riskResults'],
        condition: workflow.requiresWeather
          ? 'weather.state === completed'
          : undefined,
        retryCount: 0,
        maxRetries: 3,
        metadata: {
          priority: workflow.priority,
        },
      });
    }

    if (workflow.requiresRouting) {
      steps.push({
        agent: 'routing',
        state: 'pending',
        requiredData: ['riskResults'],
        outputData: ['routeChanges'],
        condition: 'risk.state === completed && risk.riskLevel in [high, critical]',
        retryCount: 0,
        maxRetries: 2,
        metadata: {
          priority: workflow.priority,
        },
      });
    }

    if (workflow.requiresCommunication) {
      steps.push({
        agent: 'communication',
        state: 'pending',
        requiredData: ['routeChanges'],
        outputData: ['alertsSent'],
        condition: 'routing.state === completed && routing.routeChanges.length > 0',
        retryCount: 0,
        maxRetries: 3,
        metadata: {
          priority: workflow.priority,
        },
      });
    }

    const plan: ExecutionPlan = {
      planId,
      cycleId: this.cycleId,
      shipmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      state: 'pending',
      steps,
      totalSteps: steps.length,
      completedSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      errors: [],
      metadata: {
        workflowReason: workflow.reason,
        priority: workflow.priority,
      },
    };

    this.activePlans.set(planId, plan);

    console.log(
      `[SupervisorAgent] Created execution plan ${planId} with ${steps.length} steps`
    );

    return plan;
  }

  async executePlan(planId: string): Promise<ExecutionPlan> {
    const plan = this.activePlans.get(planId);

    if (!plan) {
      throw new Error(`Execution plan not found: ${planId}`);
    }

    if (plan.state === 'running') {
      throw new Error(`Plan ${planId} is already running`);
    }

    if (plan.state === 'completed' || plan.state === 'cancelled') {
      throw new Error(`Plan ${planId} is already ${plan.state}`);
    }

    plan.state = 'running';
    plan.updatedAt = new Date();

    console.log(`[SupervisorAgent] Execution plan ${planId} ready to start`);
    console.log(`[SupervisorAgent] Plan has ${plan.totalSteps} steps:`);

    plan.steps.forEach((step, index) => {
      console.log(
        `  ${index + 1}. ${step.agent} - ${step.condition ? `[conditional: ${step.condition}]` : '[unconditional]'}`
      );
    });

    return plan;
  }

  async updateStepState(
    planId: string,
    agentType: AgentType,
    state: ExecutionState,
    error?: string,
    metadata?: Record<string, any>
  ): Promise<ExecutionPlan> {
    const plan = this.activePlans.get(planId);

    if (!plan) {
      throw new Error(`Execution plan not found: ${planId}`);
    }

    const step = plan.steps.find((s) => s.agent === agentType);

    if (!step) {
      throw new Error(`Step not found for agent: ${agentType}`);
    }

    step.state = state;
    step.updatedAt = new Date();

    if (state === 'running' && !step.startedAt) {
      step.startedAt = new Date();
    }

    if (state === 'completed' || state === 'failed' || state === 'skipped') {
      step.completedAt = new Date();
    }

    if (error) {
      step.error = error;
      plan.errors.push(`${agentType}: ${error}`);
    }

    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    plan.completedSteps = plan.steps.filter((s) => s.state === 'completed').length;
    plan.failedSteps = plan.steps.filter((s) => s.state === 'failed').length;
    plan.skippedSteps = plan.steps.filter((s) => s.state === 'skipped').length;

    if (plan.completedSteps + plan.failedSteps + plan.skippedSteps === plan.totalSteps) {
      plan.state = plan.failedSteps > 0 ? 'failed' : 'completed';
    }

    plan.updatedAt = new Date();

    return plan;
  }

  async getExecutionStatus(planId: string): Promise<ExecutionPlan | null> {
    return this.activePlans.get(planId) || null;
  }

  async getAllActivePlans(): Promise<ExecutionPlan[]> {
    return Array.from(this.activePlans.values());
  }

  async cancelPlan(planId: string, reason: string): Promise<ExecutionPlan> {
    const plan = this.activePlans.get(planId);

    if (!plan) {
      throw new Error(`Execution plan not found: ${planId}`);
    }

    plan.state = 'cancelled';
    plan.errors.push(`Cancelled: ${reason}`);
    plan.updatedAt = new Date();

    plan.steps.forEach((step) => {
      if (step.state === 'pending' || step.state === 'running') {
        step.state = 'cancelled';
        step.completedAt = new Date();
      }
    });

    console.log(`[SupervisorAgent] Plan ${planId} cancelled: ${reason}`);

    return plan;
  }

  getCycleId(): string {
    return this.cycleId;
  }

  getActivePlanCount(): number {
    return this.activePlans.size;
  }
}

export const supervisorAgent = new SupervisorAgent();
