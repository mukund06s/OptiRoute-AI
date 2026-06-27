/**
 * Workflow Scheduler Service
 * Phase 8B: Scheduled Workflow Execution
 * 
 * IMPORTANT: This scheduler contains ZERO business logic.
 * It ONLY triggers workflows by delegating to LangGraphOrchestrator.
 */

import { langGraphOrchestrator } from './agents/langGraphOrchestrator';
import { weatherService } from './weather.service';
import { prisma } from '../lib/prisma';

export interface JobStatus {
  jobId: string;
  jobName: string;
  lastRun: Date | null;
  nextRun: Date | null;
  lastDuration: number | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastError: string | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

export class WorkflowSchedulerService {
  private jobs: Map<string, JobStatus>;
  private runningJobs: Set<string>;

  constructor() {
    this.jobs = new Map();
    this.runningJobs = new Set();
  }

  /**
   * Initialize scheduler and register default jobs
   */
  async initialize(): Promise<void> {
    console.log('[WorkflowScheduler] Initializing...');

    // Register default jobs
    this.registerJob('weather-refresh', 'Weather Refresh');
    this.registerJob('risk-recalculation', 'Risk Recalculation');
    this.registerJob('workflow-execution', 'Workflow Execution');

    console.log('[WorkflowScheduler] Initialized with 3 jobs');
  }

  /**
   * Register a new job
   */
  registerJob(jobId: string, jobName: string): void {
    if (this.jobs.has(jobId)) {
      console.log(`[WorkflowScheduler] Job ${jobId} already registered`);
      return;
    }

    this.jobs.set(jobId, {
      jobId,
      jobName,
      lastRun: null,
      nextRun: null,
      lastDuration: null,
      status: 'idle',
      lastError: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
    });

    console.log(`[WorkflowScheduler] Registered job: ${jobName} (${jobId})`);
  }

  /**
   * Execute weather refresh job
   * Delegates to WeatherService - NO business logic here
   */
  async executeWeatherRefresh(): Promise<void> {
    const jobId = 'weather-refresh';

    if (!this.canExecuteJob(jobId)) {
      console.log(`[WorkflowScheduler] Skipping ${jobId} - already running`);
      return;
    }

    const startTime = Date.now();
    this.markJobRunning(jobId);

    try {
      console.log(`[WorkflowScheduler] Executing weather refresh...`);

      // Delegate to WeatherService - NO business logic here
      const results = await weatherService.getWeatherForAllHubs();

      const duration = Date.now() - startTime;
      this.markJobCompleted(jobId, duration);

      console.log(
        `[WorkflowScheduler] Weather refresh completed: ${results.length} hubs in ${duration}ms`
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.markJobFailed(jobId, duration, error.message);

      console.error(`[WorkflowScheduler] Weather refresh failed:`, error.message);
    }
  }

  /**
   * Execute risk recalculation job
   * This is a placeholder - actual implementation would delegate to RiskAgent
   */
  async executeRiskRecalculation(): Promise<void> {
    const jobId = 'risk-recalculation';

    if (!this.canExecuteJob(jobId)) {
      console.log(`[WorkflowScheduler] Skipping ${jobId} - already running`);
      return;
    }

    const startTime = Date.now();
    this.markJobRunning(jobId);

    try {
      console.log(`[WorkflowScheduler] Executing risk recalculation...`);

      // Fetch all active hubs
      const hubs = await prisma.hub.findMany({
        where: { isActive: true },
      });

      console.log(`[WorkflowScheduler] Found ${hubs.length} active hubs for risk recalculation`);

      // NOTE: In a full implementation, this would trigger RiskAgent for each hub
      // For now, we just log the intent. The actual risk calculation happens
      // during workflow execution via LangGraphOrchestrator

      const duration = Date.now() - startTime;
      this.markJobCompleted(jobId, duration);

      console.log(
        `[WorkflowScheduler] Risk recalculation completed in ${duration}ms`
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.markJobFailed(jobId, duration, error.message);

      console.error(`[WorkflowScheduler] Risk recalculation failed:`, error.message);
    }
  }

  /**
   * Execute workflow for all active shipments
   * Delegates to LangGraphOrchestrator - NO business logic here
   */
  async executeWorkflowForActiveShipments(): Promise<void> {
    const jobId = 'workflow-execution';

    if (!this.canExecuteJob(jobId)) {
      console.log(`[WorkflowScheduler] Skipping ${jobId} - already running`);
      return;
    }

    const startTime = Date.now();
    this.markJobRunning(jobId);

    try {
      console.log(`[WorkflowScheduler] Executing workflow for active shipments...`);

      // Delegate to LangGraphOrchestrator - NO business logic here
      const results = await langGraphOrchestrator.executeCycle();

      const duration = Date.now() - startTime;
      this.markJobCompleted(jobId, duration);

      console.log(
        `[WorkflowScheduler] Workflow execution completed: ${results.length} shipments in ${duration}ms`
      );

      // Log summary
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      console.log(
        `[WorkflowScheduler] Success: ${successful}, Failed: ${failed}`
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.markJobFailed(jobId, duration, error.message);

      console.error(`[WorkflowScheduler] Workflow execution failed:`, error.message);
    }
  }

  /**
   * Check if a job can be executed (not already running)
   */
  private canExecuteJob(jobId: string): boolean {
    if (this.runningJobs.has(jobId)) {
      return false;
    }
    return true;
  }

  /**
   * Mark job as running
   */
  private markJobRunning(jobId: string): void {
    this.runningJobs.add(jobId);

    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
      job.lastRun = new Date();
      job.totalRuns++;
    }
  }

  /**
   * Mark job as completed
   */
  private markJobCompleted(jobId: string, duration: number): void {
    this.runningJobs.delete(jobId);

    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.lastDuration = duration;
      job.lastError = null;
      job.successfulRuns++;
    }
  }

  /**
   * Mark job as failed
   */
  private markJobFailed(jobId: string, duration: number, error: string): void {
    this.runningJobs.delete(jobId);

    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.lastDuration = duration;
      job.lastError = error;
      job.failedRuns++;
    }
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get status of all jobs
   */
  getAllJobStatuses(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Update next run time for a job
   */
  updateNextRun(jobId: string, nextRun: Date): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.nextRun = nextRun;
    }
  }

  /**
   * Check if scheduler is healthy
   */
  isHealthy(): boolean {
    // Scheduler is healthy if no jobs are stuck in running state for too long
    const now = Date.now();
    const maxRunTime = 10 * 60 * 1000; // 10 minutes

    for (const job of this.jobs.values()) {
      if (
        job.status === 'running' &&
        job.lastRun &&
        now - job.lastRun.getTime() > maxRunTime
      ) {
        console.warn(
          `[WorkflowScheduler] Job ${job.jobId} has been running for more than 10 minutes`
        );
        return false;
      }
    }

    return true;
  }
}

export const workflowScheduler = new WorkflowSchedulerService();
