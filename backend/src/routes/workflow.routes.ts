/**
 * Workflow Routes - Exposes LangGraph Orchestrator via REST API
 * Phase 8A: Workflow API Integration
 */

import { Router } from 'express';
import { workflowController } from '../controllers/workflow.controller';
import { validate } from '../middleware/validate';
import {
  executeWorkflowSchema,
  executeBatchWorkflowSchema,
  workflowIdSchema,
  workflowHistorySchema,
} from '../lib/validation/workflow.validation';

export const workflowRouter = Router();

/**
 * POST /api/workflow/execute
 * Execute complete workflow for a single shipment
 */
workflowRouter.post(
  '/execute',
  validate(executeWorkflowSchema),
  workflowController.executeWorkflow.bind(workflowController)
);

/**
 * POST /api/workflow/execute-batch
 * Execute workflow for multiple shipments
 */
workflowRouter.post(
  '/execute-batch',
  validate(executeBatchWorkflowSchema),
  workflowController.executeBatchWorkflow.bind(workflowController)
);

/**
 * GET /api/workflow/status/:workflowId
 * Get workflow execution status
 */
workflowRouter.get(
  '/status/:workflowId',
  validate(workflowIdSchema),
  workflowController.getWorkflowStatus.bind(workflowController)
);

/**
 * GET /api/workflow/history
 * Get recent workflow execution history
 */
workflowRouter.get(
  '/history',
  validate(workflowHistorySchema),
  workflowController.getWorkflowHistory.bind(workflowController)
);
