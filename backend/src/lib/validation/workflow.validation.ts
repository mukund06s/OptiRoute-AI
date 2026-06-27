/**
 * Workflow API Validation Schemas
 * Phase 8A: Workflow API Integration
 */

import { z } from 'zod';

/**
 * POST /api/workflow/execute
 */
export const executeWorkflowSchema = z.object({
  body: z.object({
    shipmentId: z
      .number()
      .int()
      .positive()
      .describe('ID of the shipment to execute workflow for'),
  }),
});

/**
 * POST /api/workflow/execute-batch
 */
export const executeBatchWorkflowSchema = z.object({
  body: z.object({
    shipmentIds: z
      .array(z.number().int().positive())
      .min(1)
      .max(100)
      .describe('Array of shipment IDs (max 100)'),
  }),
});

/**
 * GET /api/workflow/status/:workflowId
 */
export const workflowIdSchema = z.object({
  params: z.object({
    workflowId: z
      .string()
      .uuid()
      .describe('UUID of the workflow execution'),
  }),
});

/**
 * GET /api/workflow/history
 */
export const workflowHistorySchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 50))
      .refine((val) => val > 0 && val <= 200, {
        message: 'Limit must be between 1 and 200',
      })
      .describe('Number of records to return (default: 50, max: 200)'),
    offset: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 0))
      .refine((val) => val >= 0, {
        message: 'Offset must be non-negative',
      })
      .describe('Number of records to skip (default: 0)'),
    status: z
      .enum(['completed', 'partial', 'failed', 'cancelled'])
      .optional()
      .describe('Filter by workflow status'),
  }),
});

export type ExecuteWorkflowRequest = z.infer<typeof executeWorkflowSchema>;
export type ExecuteBatchWorkflowRequest = z.infer<typeof executeBatchWorkflowSchema>;
export type WorkflowIdRequest = z.infer<typeof workflowIdSchema>;
export type WorkflowHistoryRequest = z.infer<typeof workflowHistorySchema>;
