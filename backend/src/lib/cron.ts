/**
 * Cron Jobs - Scheduled Task Management
 * Phase 8B: Scheduled Workflow Execution
 * 
 * Uses node-cron to schedule periodic workflow executions
 */

import cron from 'node-cron';
import { workflowScheduler } from '../services/workflowScheduler.service';

interface CronJob {
  task: cron.ScheduledTask;
  name: string;
  schedule: string;
}

class CronManager {
  private jobs: Map<string, CronJob>;
  private isRunning: boolean;

  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all cron jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[CronManager] Already running');
      return;
    }

    console.log('[CronManager] Starting cron jobs...');

    // Initialize workflow scheduler
    await workflowScheduler.initialize();

    // Schedule weather refresh - every 30 minutes
    this.scheduleWeatherRefresh();

    // Schedule risk recalculation - every 30 minutes
    this.scheduleRiskRecalculation();

    // Schedule workflow execution - every 15 minutes
    this.scheduleWorkflowExecution();

    this.isRunning = true;
    console.log(`[CronManager] Started ${this.jobs.size} cron jobs`);
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[CronManager] Not running');
      return;
    }

    console.log('[CronManager] Stopping cron jobs...');

    for (const [jobId, job] of this.jobs.entries()) {
      job.task.stop();
      console.log(`[CronManager] Stopped job: ${job.name}`);
    }

    this.jobs.clear();
    this.isRunning = false;

    console.log('[CronManager] All cron jobs stopped');
  }

  /**
   * Schedule weather refresh job - every 30 minutes
   */
  private scheduleWeatherRefresh(): void {
    const jobId = 'weather-refresh';
    const schedule = '*/30 * * * *'; // Every 30 minutes

    const task = cron.schedule(
      schedule,
      async () => {
        console.log('\n[CronManager] Weather refresh triggered');
        await workflowScheduler.executeWeatherRefresh();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.jobs.set(jobId, {
      task,
      name: 'Weather Refresh',
      schedule,
    });

    // Calculate next run
    const nextRun = this.calculateNextRun(schedule);
    workflowScheduler.updateNextRun(jobId, nextRun);

    console.log(`[CronManager] Scheduled: Weather Refresh (${schedule})`);
    console.log(`[CronManager] Next run: ${nextRun.toISOString()}`);
  }

  /**
   * Schedule risk recalculation job - every 30 minutes
   */
  private scheduleRiskRecalculation(): void {
    const jobId = 'risk-recalculation';
    const schedule = '*/30 * * * *'; // Every 30 minutes

    const task = cron.schedule(
      schedule,
      async () => {
        console.log('\n[CronManager] Risk recalculation triggered');
        await workflowScheduler.executeRiskRecalculation();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.jobs.set(jobId, {
      task,
      name: 'Risk Recalculation',
      schedule,
    });

    // Calculate next run
    const nextRun = this.calculateNextRun(schedule);
    workflowScheduler.updateNextRun(jobId, nextRun);

    console.log(`[CronManager] Scheduled: Risk Recalculation (${schedule})`);
    console.log(`[CronManager] Next run: ${nextRun.toISOString()}`);
  }

  /**
   * Schedule workflow execution job - every 15 minutes
   */
  private scheduleWorkflowExecution(): void {
    const jobId = 'workflow-execution';
    const intervalMinutes = parseInt(
      process.env.AGENT_CYCLE_INTERVAL_MINUTES || '15',
      10
    );
    const schedule = `*/${intervalMinutes} * * * *`; // Every N minutes

    const task = cron.schedule(
      schedule,
      async () => {
        console.log('\n[CronManager] Workflow execution triggered');
        await workflowScheduler.executeWorkflowForActiveShipments();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.jobs.set(jobId, {
      task,
      name: 'Workflow Execution',
      schedule,
    });

    // Calculate next run
    const nextRun = this.calculateNextRun(schedule);
    workflowScheduler.updateNextRun(jobId, nextRun);

    console.log(`[CronManager] Scheduled: Workflow Execution (${schedule})`);
    console.log(`[CronManager] Next run: ${nextRun.toISOString()}`);
  }

  /**
   * Calculate next run time based on cron schedule
   */
  private calculateNextRun(schedule: string): Date {
    // Parse schedule to estimate next run
    // For simplicity, we'll calculate based on current time + interval
    const parts = schedule.split(' ');
    const minutePart = parts[0];

    if (minutePart.startsWith('*/')) {
      const interval = parseInt(minutePart.substring(2), 10);
      const now = new Date();
      const nextRun = new Date(now.getTime() + interval * 60 * 1000);
      return nextRun;
    }

    // Default: next hour
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Get all scheduled jobs
   */
  getJobs(): Array<{ jobId: string; name: string; schedule: string }> {
    return Array.from(this.jobs.entries()).map(([jobId, job]) => ({
      jobId,
      name: job.name,
      schedule: job.schedule,
    }));
  }

  /**
   * Check if cron manager is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export const cronManager = new CronManager();
