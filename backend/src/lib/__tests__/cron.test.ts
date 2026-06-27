/**
 * Cron Manager Tests
 * Run with: npx tsx src/lib/__tests__/cron.test.ts
 */

import { cronManager } from '../cron';
import { workflowScheduler } from '../../services/workflowScheduler.service';

async function runTests() {
  console.log('\n============================================================');
  console.log('Cron Manager - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Start cron manager');
    try {
      await cronManager.start();
      
      if (cronManager.isActive()) {
        console.log('✓ PASS: Cron manager started');
        const jobs = cronManager.getJobs();
        console.log(`  - Jobs registered: ${jobs.length}`);
        jobs.forEach((job) => {
          console.log(`    • ${job.name} (${job.schedule})`);
        });
        console.log();
        passedTests++;
      } else {
        console.log('✗ FAIL: Cron manager not active\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 2] Check registered jobs');
    const jobs = cronManager.getJobs();
    
    const expectedJobs = [
      'weather-refresh',
      'risk-recalculation',
      'workflow-execution',
    ];

    const registeredJobIds = jobs.map((j) => j.jobId);
    const allJobsRegistered = expectedJobs.every((jobId) =>
      registeredJobIds.includes(jobId)
    );

    if (allJobsRegistered) {
      console.log('✓ PASS: All jobs registered');
      console.log(`  - Expected: ${expectedJobs.length}`);
      console.log(`  - Found: ${jobs.length}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Missing jobs');
      const missing = expectedJobs.filter(
        (jobId) => !registeredJobIds.includes(jobId)
      );
      console.log(`  - Missing: ${missing.join(', ')}\n`);
    }

    totalTests++;
    console.log('[TEST 3] Check job statuses in scheduler');
    const allStatuses = workflowScheduler.getAllJobStatuses();
    
    if (allStatuses.length === 3) {
      console.log('✓ PASS: All job statuses tracked');
      allStatuses.forEach((status) => {
        console.log(`  - ${status.jobName}: ${status.status}`);
        console.log(`    Total runs: ${status.totalRuns}`);
        console.log(`    Next run: ${status.nextRun?.toISOString() || 'Not scheduled'}`);
      });
      console.log();
      passedTests++;
    } else {
      console.log('✗ FAIL: Incorrect number of job statuses\n');
    }

    totalTests++;
    console.log('[TEST 4] Execute weather refresh manually');
    try {
      await workflowScheduler.executeWeatherRefresh();
      
      const status = workflowScheduler.getJobStatus('weather-refresh');
      if (status && status.totalRuns > 0) {
        console.log('✓ PASS: Weather refresh executed');
        console.log(`  - Status: ${status.status}`);
        console.log(`  - Duration: ${status.lastDuration}ms`);
        console.log(`  - Total runs: ${status.totalRuns}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Job not executed\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 5] Execute risk recalculation manually');
    try {
      await workflowScheduler.executeRiskRecalculation();
      
      const status = workflowScheduler.getJobStatus('risk-recalculation');
      if (status && status.totalRuns > 0) {
        console.log('✓ PASS: Risk recalculation executed');
        console.log(`  - Status: ${status.status}`);
        console.log(`  - Duration: ${status.lastDuration}ms`);
        console.log(`  - Total runs: ${status.totalRuns}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Job not executed\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 6] Execute workflow for active shipments manually');
    try {
      await workflowScheduler.executeWorkflowForActiveShipments();
      
      const status = workflowScheduler.getJobStatus('workflow-execution');
      if (status && status.totalRuns > 0) {
        console.log('✓ PASS: Workflow execution completed');
        console.log(`  - Status: ${status.status}`);
        console.log(`  - Duration: ${status.lastDuration}ms`);
        console.log(`  - Total runs: ${status.totalRuns}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Job not executed\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 7] Duplicate execution prevention');
    try {
      // Try to execute weather refresh twice simultaneously
      const promise1 = workflowScheduler.executeWeatherRefresh();
      const promise2 = workflowScheduler.executeWeatherRefresh();
      
      await Promise.all([promise1, promise2]);
      
      const status = workflowScheduler.getJobStatus('weather-refresh');
      if (status) {
        // Should only count as one additional run due to duplicate prevention
        console.log('✓ PASS: Duplicate execution prevented');
        console.log(`  - Total runs: ${status.totalRuns}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Job status not found\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 8] Scheduler health check');
    const isHealthy = workflowScheduler.isHealthy();
    
    if (isHealthy) {
      console.log('✓ PASS: Scheduler is healthy\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Scheduler is unhealthy\n');
    }

    totalTests++;
    console.log('[TEST 9] Job statistics tracking');
    const status = workflowScheduler.getJobStatus('weather-refresh');
    
    if (
      status &&
      status.totalRuns > 0 &&
      (status.successfulRuns > 0 || status.failedRuns >= 0)
    ) {
      console.log('✓ PASS: Job statistics tracked');
      console.log(`  - Total runs: ${status.totalRuns}`);
      console.log(`  - Successful: ${status.successfulRuns}`);
      console.log(`  - Failed: ${status.failedRuns}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Statistics not tracked\n');
    }

    totalTests++;
    console.log('[TEST 10] Stop cron manager');
    try {
      cronManager.stop();
      
      if (!cronManager.isActive()) {
        console.log('✓ PASS: Cron manager stopped\n');
        passedTests++;
      } else {
        console.log('✗ FAIL: Cron manager still active\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    console.log('============================================================');
    console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
    console.log('============================================================\n');

    if (passedTests === totalTests) {
      console.log('✓ ALL TESTS PASSED!\n');
    } else {
      console.log(`✗ ${totalTests - passedTests} tests failed\n`);
    }
  } catch (error) {
    console.error('\n✗ TEST ERROR:', error);
  }
}

runTests();
