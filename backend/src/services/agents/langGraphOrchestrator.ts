/**
 * LangGraph Orchestrator - Pure Orchestration Layer
 * Does NOT contain business logic - only coordinates agent execution
 */

import { supervisorAgent, ExecutionPlan, AgentType } from './supervisorAgent';
import { weatherAgent, WeatherAgentResult } from './weatherAgent';
import { riskAgent, RiskAgentResult } from './riskAgent';
import { routingAgent, RoutingAgentResult } from './routingAgent';
import { communicationAgent, CommunicationAgentResult } from './communicationAgent';
import { prisma } from '../../lib/prisma';

export interface ShipmentContext {
  shipmentId: number;
  trackingId: string;
  currentHubId: number | null;
  destinationHubId: number;
  activeRoute: number[];
  priority: string;
}

export interface OrchestrationResult {
  success: boolean;
  workflowId: string;
  cycleId: string;
  executionPlan: ExecutionPlan;
  agentResults: {
    weather?: WeatherAgentResult;
    risk?: RiskAgentResult;
    routing?: RoutingAgentResult;
    communication?: CommunicationAgentResult;
  };
  overallStatus: 'completed' | 'partial' | 'failed' | 'cancelled';
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  summary: {
    stepsExecuted: number;
    stepsSkipped: number;
    stepsFailed: number;
    actionsPerformed: string[];
  };
  metadata: {
    shipmentContext?: ShipmentContext;
    timestamp: Date;
    source: string;
  };
}

export class LangGraphOrchestrator {
  private initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async initialize(): Promise<boolean> {
    console.log('[LangGraphOrchestrator] Initializing...');

    // Initialize all agents
    await supervisorAgent.initialize();
    await weatherAgent.initialize();
    await riskAgent.initialize();
    await routingAgent.initialize();
    await communicationAgent.initialize();

    this.initialized = true;
    console.log('[LangGraphOrchestrator] All agents initialized');
    return true;
  }

  /**
   * Execute full workflow for a shipment
   * Pure orchestration - delegates all business logic to agents
   */
  async executeWorkflow(
    shipmentContext: ShipmentContext
  ): Promise<OrchestrationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    console.log(
      `\n[LangGraphOrchestrator] Starting workflow for shipment ${shipmentContext.trackingId}`
    );

    try {
      // Step 1: Initialize cycle via Supervisor
      const cycleId = await supervisorAgent.initialize(
        `cycle_${shipmentContext.shipmentId}_${Date.now()}`
      );
      console.log(`[LangGraphOrchestrator] Cycle initialized: ${cycleId}`);

      // Step 2: Evaluate shipment and determine workflow
      const evaluation = await supervisorAgent.evaluateShipment(
        shipmentContext.shipmentId
      );
      console.log(
        `[LangGraphOrchestrator] Shipment evaluated: needs evaluation = ${evaluation.needsEvaluation}`
      );

      if (!evaluation.needsEvaluation) {
        warnings.push('Shipment does not need evaluation at this time');
      }

      const workflow = await supervisorAgent.determineWorkflow(evaluation);
      console.log(
        `[LangGraphOrchestrator] Workflow determined: weather=${workflow.requiresWeather}, risk=${workflow.requiresRisk}, routing=${workflow.requiresRouting}, communication=${workflow.requiresCommunication}`
      );

      // Step 3: Create execution plan
      const executionPlan = await supervisorAgent.createExecutionPlan(
        workflow,
        shipmentContext.shipmentId
      );
      console.log(
        `[LangGraphOrchestrator] Execution plan created: ${executionPlan.planId} with ${executionPlan.totalSteps} steps`
      );

      // Step 4: Execute the plan (sequential agent calls)
      const agentResults = await this.executePlan(
        executionPlan,
        shipmentContext,
        warnings,
        errors
      );

      // Step 5: Calculate execution metrics
      const executionTimeMs = Date.now() - startTime;
      const updatedPlan = await supervisorAgent.getExecutionStatus(
        executionPlan.planId
      );

      if (!updatedPlan) {
        throw new Error('Failed to retrieve updated execution plan');
      }

      const overallStatus = this.determineOverallStatus(updatedPlan);

      const summary = {
        stepsExecuted: updatedPlan.completedSteps,
        stepsSkipped: updatedPlan.skippedSteps,
        stepsFailed: updatedPlan.failedSteps,
        actionsPerformed: this.extractActionsPerformed(agentResults),
      };

      console.log(
        `[LangGraphOrchestrator] Workflow completed: ${overallStatus} in ${executionTimeMs}ms`
      );

      return {
        success: overallStatus === 'completed' || overallStatus === 'partial',
        workflowId: executionPlan.planId,
        cycleId,
        executionPlan: updatedPlan,
        agentResults,
        overallStatus,
        executionTimeMs,
        warnings,
        errors,
        summary,
        metadata: {
          shipmentContext,
          timestamp: new Date(),
          source: 'langgraph_orchestrator',
        },
      };
    } catch (error: any) {
      console.error('[LangGraphOrchestrator] Workflow failed:', error.message);

      const executionTimeMs = Date.now() - startTime;
      errors.push(error.message);

      return {
        success: false,
        workflowId: 'error',
        cycleId: 'error',
        executionPlan: {
          planId: 'error',
          cycleId: 'error',
          shipmentId: shipmentContext.shipmentId,
          createdAt: new Date(),
          updatedAt: new Date(),
          state: 'failed',
          steps: [],
          totalSteps: 0,
          completedSteps: 0,
          failedSteps: 0,
          skippedSteps: 0,
          errors: [error.message],
          metadata: {},
        },
        agentResults: {},
        overallStatus: 'failed',
        executionTimeMs,
        warnings,
        errors,
        summary: {
          stepsExecuted: 0,
          stepsSkipped: 0,
          stepsFailed: 0,
          actionsPerformed: [],
        },
        metadata: {
          shipmentContext,
          timestamp: new Date(),
          source: 'error',
        },
      };
    }
  }

  /**
   * Execute cycle for all active shipments
   * Pure orchestration - no business logic
   */
  async executeCycle(): Promise<OrchestrationResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('\n[LangGraphOrchestrator] Starting cycle for all active shipments');

    try {
      // Fetch all active shipments
      const shipments = await prisma.shipment.findMany({
        where: {
          status: { in: ['in_transit', 'delayed', 'at_risk'] },
        },
      });

      console.log(`[LangGraphOrchestrator] Found ${shipments.length} active shipments`);

      if (shipments.length === 0) {
        console.log('[LangGraphOrchestrator] No active shipments to process');
        return [];
      }

      // Execute workflow for each shipment
      const results: OrchestrationResult[] = [];

      for (const shipment of shipments) {
        const context: ShipmentContext = {
          shipmentId: shipment.id,
          trackingId: shipment.trackingId,
          currentHubId: shipment.currentHubId,
          destinationHubId: shipment.destinationHubId,
          activeRoute: shipment.activeRoute as number[],
          priority: shipment.priority,
        };

        const result = await this.executeWorkflow(context);
        results.push(result);
      }

      console.log(`[LangGraphOrchestrator] Cycle completed: ${results.length} shipments processed`);

      return results;
    } catch (error: any) {
      console.error('[LangGraphOrchestrator] Cycle failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute execution plan by calling agents sequentially
   * Pure orchestration - delegates all logic to agents
   */
  private async executePlan(
    executionPlan: ExecutionPlan,
    shipmentContext: ShipmentContext,
    warnings: string[],
    errors: string[]
  ): Promise<OrchestrationResult['agentResults']> {
    const agentResults: OrchestrationResult['agentResults'] = {};

    for (const step of executionPlan.steps) {
      console.log(`[LangGraphOrchestrator] Executing step: ${step.agent} (${step.state})`);

      // Skip steps that are already completed or not pending
      if (step.state !== 'pending') {
        console.log(`[LangGraphOrchestrator] Skipping ${step.agent}: state is ${step.state}`);
        continue;
      }

      // Update step state to running
      await supervisorAgent.updateStepState(
        executionPlan.planId,
        step.agent,
        'running'
      );

      try {
        // Call the appropriate agent (pure delegation, no business logic here)
        const result = await this.callAgent(
          step.agent,
          shipmentContext,
          step,
          agentResults
        );

        if (result.success) {
          // Store result
          agentResults[step.agent] = result;

          // Update step state to completed
          await supervisorAgent.updateStepState(
            executionPlan.planId,
            step.agent,
            'completed',
            undefined,
            { executionTimeMs: result.metadata.executionTimeMs }
          );

          console.log(`[LangGraphOrchestrator] Completed ${step.agent}`);

          // Check if next steps should be skipped based on results
          if (this.shouldSkipRemainingSteps(step.agent, result)) {
            console.log(
              `[LangGraphOrchestrator] Skipping remaining steps: no critical action needed`
            );
            await this.skipRemainingSteps(executionPlan, step.agent);
            break;
          }
        } else {
          // Handle failure
          errors.push(`${step.agent} failed: ${result.errors.join(', ')}`);

          await supervisorAgent.updateStepState(
            executionPlan.planId,
            step.agent,
            'failed',
            result.errors.join('; ')
          );

          console.log(`[LangGraphOrchestrator] Failed ${step.agent}`);

          // Stop execution on critical failure
          break;
        }
      } catch (error: any) {
        console.error(`[LangGraphOrchestrator] Error in ${step.agent}:`, error.message);
        errors.push(`${step.agent} error: ${error.message}`);

        await supervisorAgent.updateStepState(
          executionPlan.planId,
          step.agent,
          'failed',
          error.message
        );

        // Stop execution on error
        break;
      }
    }

    return agentResults;
  }

  /**
   * Call the appropriate agent based on step type
   * Pure delegation - no business logic
   */
  private async callAgent(
    agentType: AgentType,
    context: ShipmentContext,
    step: any,
    previousResults: OrchestrationResult['agentResults']
  ): Promise<any> {
    switch (agentType) {
      case 'weather':
        return await weatherAgent.execute(context, step);

      case 'risk':
        return await riskAgent.execute(
          context,
          step,
          previousResults.weather
        );

      case 'routing':
        return await routingAgent.execute(
          context,
          step,
          previousResults.risk
        );

      case 'communication':
        return await communicationAgent.execute(
          context,
          step,
          previousResults.weather,
          previousResults.risk,
          previousResults.routing
        );

      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Determine if remaining steps should be skipped based on agent result
   * Pure orchestration logic - no business logic
   */
  private shouldSkipRemainingSteps(
    agentType: AgentType,
    result: any
  ): boolean {
    // Skip remaining steps if risk assessment shows no high/critical risk
    if (agentType === 'risk') {
      const riskResult = result as RiskAgentResult;
      const highestRisk = riskResult.overallRisk?.highestRisk || 'low';
      return highestRisk !== 'high' && highestRisk !== 'critical';
    }

    // Skip communication if no routes were changed
    if (agentType === 'routing') {
      const routingResult = result as RoutingAgentResult;
      return routingResult.summary?.totalRerouted === 0;
    }

    return false;
  }

  /**
   * Skip all remaining steps in the execution plan
   */
  private async skipRemainingSteps(
    executionPlan: ExecutionPlan,
    currentAgent: AgentType
  ): Promise<void> {
    let foundCurrent = false;

    for (const step of executionPlan.steps) {
      if (step.agent === currentAgent) {
        foundCurrent = true;
        continue;
      }

      if (foundCurrent && step.state === 'pending') {
        await supervisorAgent.updateStepState(
          executionPlan.planId,
          step.agent,
          'skipped'
        );
      }
    }
  }

  /**
   * Determine overall workflow status
   */
  private determineOverallStatus(
    plan: ExecutionPlan
  ): OrchestrationResult['overallStatus'] {
    if (plan.state === 'cancelled') {
      return 'cancelled';
    }

    if (plan.failedSteps > 0) {
      return plan.completedSteps > 0 ? 'partial' : 'failed';
    }

    if (plan.completedSteps > 0) {
      return 'completed';
    }

    return 'failed';
  }

  /**
   * Extract actions performed from agent results
   */
  private extractActionsPerformed(
    results: OrchestrationResult['agentResults']
  ): string[] {
    const actions: string[] = [];

    if (results.weather) {
      actions.push(
        `Weather: Checked ${results.weather.hubsProcessed} hubs, highest impact ${results.weather.impactAssessment?.highestImpact || 'N/A'}`
      );
    }

    if (results.risk) {
      actions.push(
        `Risk: Assessed ${results.risk.hubsProcessed} hubs, highest risk ${results.risk.overallRisk?.highestRisk || 'N/A'}`
      );
    }

    if (results.routing) {
      actions.push(
        `Routing: ${results.routing.summary?.totalRerouted || 0} rerouted, ${results.routing.summary?.totalUnchanged || 0} unchanged`
      );
    }

    if (results.communication) {
      actions.push(
        `Communication: ${results.communication.messagesGenerated} messages prepared, severity ${results.communication.severity}`
      );
    }

    return actions;
  }

  /**
   * Cancel an active workflow
   */
  async cancelWorkflow(
    workflowId: string,
    reason: string
  ): Promise<ExecutionPlan> {
    return await supervisorAgent.cancelPlan(workflowId, reason);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<ExecutionPlan | null> {
    return await supervisorAgent.getExecutionStatus(workflowId);
  }

  /**
   * Get all active workflows
   */
  async getAllActiveWorkflows(): Promise<ExecutionPlan[]> {
    return await supervisorAgent.getAllActivePlans();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const langGraphOrchestrator = new LangGraphOrchestrator();
