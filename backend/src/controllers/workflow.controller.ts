/**
 * Workflow Controller - REST API for LangGraph Orchestrator
 * Phase 8A: Workflow API Integration
 * 
 * IMPORTANT: This controller contains ZERO business logic.
 * It ONLY validates requests and delegates to LangGraphOrchestrator.
 */

import { Request, Response } from 'express';
import { langGraphOrchestrator } from '../services/agents/langGraphOrchestrator';
import { prisma } from '../lib/prisma';

export class WorkflowController {
  /**
   * POST /api/workflow/execute
   * Execute complete workflow for a single shipment
   */
  async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentId } = req.body;

      // Fetch shipment details
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        res.status(404).json({
          error: 'Shipment not found',
          message: `Shipment with ID ${shipmentId} does not exist`,
        });
        return;
      }

      // Prepare shipment context
      const shipmentContext = {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        currentHubId: shipment.currentHubId,
        destinationHubId: shipment.destinationHubId,
        activeRoute: shipment.activeRoute as number[],
        priority: shipment.priority,
      };

      // Delegate to LangGraph Orchestrator (NO business logic here)
      const result = await langGraphOrchestrator.executeWorkflow(shipmentContext);

      res.status(200).json({
        success: result.success,
        workflowId: result.workflowId,
        cycleId: result.cycleId,
        shipmentId: shipmentId,
        trackingId: shipment.trackingId,
        overallStatus: result.overallStatus,
        executionTimeMs: result.executionTimeMs,
        summary: result.summary,
        agentResults: {
          weather: result.agentResults.weather
            ? {
                success: result.agentResults.weather.success,
                hubsProcessed: result.agentResults.weather.hubsProcessed,
                highestImpact: result.agentResults.weather.impactAssessment?.highestImpact,
              }
            : null,
          risk: result.agentResults.risk
            ? {
                success: result.agentResults.risk.success,
                hubsProcessed: result.agentResults.risk.hubsProcessed,
                highestRisk: result.agentResults.risk.overallRisk?.highestRisk,
              }
            : null,
          routing: result.agentResults.routing
            ? {
                success: result.agentResults.routing.success,
                totalRerouted: result.agentResults.routing.summary?.totalRerouted,
                totalUnchanged: result.agentResults.routing.summary?.totalUnchanged,
              }
            : null,
          communication: result.agentResults.communication
            ? {
                success: result.agentResults.communication.success,
                messagesGenerated: result.agentResults.communication.messagesGenerated,
                severity: result.agentResults.communication.severity,
              }
            : null,
        },
        warnings: result.warnings,
        errors: result.errors,
        metadata: result.metadata,
      });
    } catch (error: any) {
      console.error('[WorkflowController] Execute workflow error:', error.message);
      res.status(500).json({
        error: 'Workflow execution failed',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/workflow/execute-batch
   * Execute workflow for multiple shipments
   */
  async executeBatchWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { shipmentIds } = req.body;

      // Fetch all shipments
      const shipments = await prisma.shipment.findMany({
        where: {
          id: { in: shipmentIds },
        },
      });

      if (shipments.length === 0) {
        res.status(404).json({
          error: 'No shipments found',
          message: 'None of the provided shipment IDs exist',
        });
        return;
      }

      const notFound = shipmentIds.filter(
        (id: number) => !shipments.find((s) => s.id === id)
      );

      // Execute workflow for each shipment
      const results = [];
      const completed = [];
      const failed = [];

      for (const shipment of shipments) {
        try {
          const shipmentContext = {
            shipmentId: shipment.id,
            trackingId: shipment.trackingId,
            currentHubId: shipment.currentHubId,
            destinationHubId: shipment.destinationHubId,
            activeRoute: shipment.activeRoute as number[],
            priority: shipment.priority,
          };

          // Delegate to LangGraph Orchestrator (NO business logic here)
          const result = await langGraphOrchestrator.executeWorkflow(shipmentContext);

          results.push({
            shipmentId: shipment.id,
            trackingId: shipment.trackingId,
            success: result.success,
            workflowId: result.workflowId,
            overallStatus: result.overallStatus,
            executionTimeMs: result.executionTimeMs,
          });

          if (result.success) {
            completed.push(shipment.id);
          } else {
            failed.push(shipment.id);
          }
        } catch (error: any) {
          results.push({
            shipmentId: shipment.id,
            trackingId: shipment.trackingId,
            success: false,
            error: error.message,
          });
          failed.push(shipment.id);
        }
      }

      res.status(200).json({
        success: failed.length === 0,
        total: shipmentIds.length,
        completed: completed.length,
        failed: failed.length,
        notFound: notFound.length,
        completedIds: completed,
        failedIds: failed,
        notFoundIds: notFound,
        results: results,
      });
    } catch (error: any) {
      console.error('[WorkflowController] Execute batch workflow error:', error.message);
      res.status(500).json({
        error: 'Batch workflow execution failed',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/workflow/status/:workflowId
   * Get workflow execution status
   */
  async getWorkflowStatus(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;

      // Delegate to LangGraph Orchestrator (NO business logic here)
      const executionPlan = await langGraphOrchestrator.getWorkflowStatus(workflowId);

      if (!executionPlan) {
        res.status(404).json({
          error: 'Workflow not found',
          message: `Workflow with ID ${workflowId} does not exist`,
        });
        return;
      }

      res.status(200).json({
        workflowId: executionPlan.planId,
        cycleId: executionPlan.cycleId,
        shipmentId: executionPlan.shipmentId,
        state: executionPlan.state,
        createdAt: executionPlan.createdAt,
        updatedAt: executionPlan.updatedAt,
        steps: executionPlan.steps.map((step) => ({
          agent: step.agent,
          state: step.state,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
          error: step.error,
        })),
        totalSteps: executionPlan.totalSteps,
        completedSteps: executionPlan.completedSteps,
        failedSteps: executionPlan.failedSteps,
        skippedSteps: executionPlan.skippedSteps,
        errors: executionPlan.errors,
      });
    } catch (error: any) {
      console.error('[WorkflowController] Get workflow status error:', error.message);
      res.status(500).json({
        error: 'Failed to retrieve workflow status',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/workflow/history
   * Get recent workflow execution history
   */
  async getWorkflowHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const status = req.query.status as string | undefined;

      // Delegate to LangGraph Orchestrator (NO business logic here)
      const allPlans = await langGraphOrchestrator.getAllActiveWorkflows();

      // Filter by status if provided
      let filteredPlans = allPlans;
      if (status) {
        filteredPlans = allPlans.filter((plan) => plan.state === status);
      }

      // Sort by updatedAt descending (most recent first)
      filteredPlans.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      );

      // Apply pagination
      const paginatedPlans = filteredPlans.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        total: filteredPlans.length,
        limit: limit,
        offset: offset,
        count: paginatedPlans.length,
        workflows: paginatedPlans.map((plan) => ({
          workflowId: plan.planId,
          cycleId: plan.cycleId,
          shipmentId: plan.shipmentId,
          state: plan.state,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
          totalSteps: plan.totalSteps,
          completedSteps: plan.completedSteps,
          failedSteps: plan.failedSteps,
          skippedSteps: plan.skippedSteps,
        })),
      });
    } catch (error: any) {
      console.error('[WorkflowController] Get workflow history error:', error.message);
      res.status(500).json({
        error: 'Failed to retrieve workflow history',
        message: error.message,
      });
    }
  }
}

export const workflowController = new WorkflowController();
