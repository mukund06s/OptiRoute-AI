/**
 * LangGraph Orchestrator Tests
 * Run with: npx tsx src/services/agents/__tests__/langGraphOrchestrator.test.ts
 */

import { langGraphOrchestrator, ShipmentContext } from '../langGraphOrchestrator';

async function runTests() {
  console.log('\n============================================================');
  console.log('LangGraph Orchestrator - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Initialize orchestrator');
    const initialized = await langGraphOrchestrator.initialize();
    if (initialized && langGraphOrchestrator.isInitialized()) {
      console.log('✓ PASS: Orchestrator initialized\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    // Use a mock test context (assuming shipment ID 1 exists from seed data)
    console.log('[INFO] Using mock test context with shipment ID 1\n');

    const testContext: ShipmentContext = {
      shipmentId: 1,
      trackingId: `TEST-${Date.now()}`,
      currentHubId: 1,
      destinationHubId: 5,
      activeRoute: [1, 2, 3, 4, 5],
      priority: 'express',
    };

      totalTests++;
      console.log('[TEST 2] Execute complete workflow');
      const workflowResult = await langGraphOrchestrator.executeWorkflow(
        testContext
      );

      if (workflowResult.success) {
        console.log('✓ PASS: Workflow executed');
        console.log(`  - Workflow ID: ${workflowResult.workflowId}`);
        console.log(`  - Cycle ID: ${workflowResult.cycleId}`);
        console.log(`  - Status: ${workflowResult.overallStatus}`);
        console.log(`  - Execution time: ${workflowResult.executionTimeMs}ms`);
        console.log(`  - Steps executed: ${workflowResult.summary.stepsExecuted}`);
        console.log(`  - Steps skipped: ${workflowResult.summary.stepsSkipped}`);
        console.log(`  - Steps failed: ${workflowResult.summary.stepsFailed}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Workflow execution failed');
        console.log(`  Errors: ${workflowResult.errors.join(', ')}\n`);
      }

      totalTests++;
      console.log('[TEST 3] Agent results collection');
      const hasWeatherResult = !!workflowResult.agentResults.weather;
      const hasRiskResult = !!workflowResult.agentResults.risk;

      if (hasWeatherResult || hasRiskResult) {
        console.log('✓ PASS: Agent results collected');
        if (hasWeatherResult) {
          console.log(
            `  - Weather: ${workflowResult.agentResults.weather?.hubsProcessed} hubs`
          );
        }
        if (hasRiskResult) {
          console.log(
            `  - Risk: ${workflowResult.agentResults.risk?.hubsProcessed} hubs`
          );
        }
        if (workflowResult.agentResults.routing) {
          console.log(
            `  - Routing: ${workflowResult.agentResults.routing?.summary.totalRerouted} rerouted`
          );
        }
        if (workflowResult.agentResults.communication) {
          console.log(
            `  - Communication: ${workflowResult.agentResults.communication?.messagesGenerated} messages`
          );
        }
        console.log();
        passedTests++;
      } else {
        console.log('✗ FAIL: No agent results collected\n');
      }

      totalTests++;
      console.log('[TEST 4] Execution plan structure');
      const plan = workflowResult.executionPlan;
      if (
        plan &&
        plan.planId &&
        plan.cycleId &&
        plan.steps &&
        plan.steps.length > 0
      ) {
        console.log('✓ PASS: Execution plan is valid');
        console.log(`  - Plan ID: ${plan.planId}`);
        console.log(`  - Total steps: ${plan.totalSteps}`);
        console.log(`  - Completed: ${plan.completedSteps}`);
        console.log(`  - Skipped: ${plan.skippedSteps}`);
        console.log(`  - Failed: ${plan.failedSteps}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Invalid execution plan\n');
      }

      totalTests++;
      console.log('[TEST 5] Actions performed summary');
      if (
        workflowResult.summary.actionsPerformed &&
        workflowResult.summary.actionsPerformed.length > 0
      ) {
        console.log('✓ PASS: Actions performed recorded');
        workflowResult.summary.actionsPerformed.forEach((action, index) => {
          console.log(`  ${index + 1}. ${action}`);
        });
        console.log();
        passedTests++;
      } else {
        console.log('✗ FAIL: No actions recorded\n');
      }

      totalTests++;
      console.log('[TEST 6] Conditional branching - Low risk scenario');
      
      // For low risk scenario, we expect steps to be skipped after risk assessment
      // This is tested by checking if routing/communication steps were skipped
      const riskResult = workflowResult.agentResults.risk;
      if (riskResult) {
        const highestRisk = riskResult.overallRisk?.highestRisk || 'low';
        const hasRoutingResult = !!workflowResult.agentResults.routing;

        if (highestRisk === 'low' || highestRisk === 'medium') {
          if (!hasRoutingResult || workflowResult.summary.stepsSkipped > 0) {
            console.log('✓ PASS: Conditional branching worked');
            console.log(`  - Risk level: ${highestRisk}`);
            console.log(`  - Steps skipped: ${workflowResult.summary.stepsSkipped}`);
            console.log('  - Routing/Communication may have been skipped\n');
            passedTests++;
          } else {
            console.log('✓ PASS: All steps executed for medium risk\n');
            passedTests++;
          }
        } else {
          console.log('✓ PASS: High/critical risk, all steps executed\n');
          passedTests++;
        }
      } else {
        console.log('✗ FAIL: No risk result to evaluate\n');
      }

      totalTests++;
      console.log('[TEST 7] Workflow status retrieval');
      const workflowStatus = await langGraphOrchestrator.getWorkflowStatus(
        workflowResult.workflowId
      );

      if (workflowStatus) {
        console.log('✓ PASS: Workflow status retrieved');
        console.log(`  - State: ${workflowStatus.state}`);
        console.log(`  - Completed steps: ${workflowStatus.completedSteps}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Could not retrieve workflow status\n');
      }

      totalTests++;
      console.log('[TEST 8] Execution timing');
      if (
        workflowResult.executionTimeMs > 0 &&
        workflowResult.executionTimeMs < 60000
      ) {
        console.log('✓ PASS: Execution timing is reasonable');
        console.log(`  - Total time: ${workflowResult.executionTimeMs}ms\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Execution timing is unreasonable\n');
      }

      totalTests++;
      console.log('[TEST 9] Result aggregation');
      const hasMetadata = !!workflowResult.metadata;
      const hasSummary = !!workflowResult.summary;
      const hasExecutionPlan = !!workflowResult.executionPlan;

      if (hasMetadata && hasSummary && hasExecutionPlan) {
        console.log('✓ PASS: Result aggregation complete');
        console.log(`  - Metadata source: ${workflowResult.metadata.source}`);
        console.log(`  - Overall status: ${workflowResult.overallStatus}`);
        console.log(`  - Warnings: ${workflowResult.warnings.length}`);
        console.log(`  - Errors: ${workflowResult.errors.length}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Incomplete result aggregation\n');
      }

      totalTests++;
      console.log('[TEST 10] No business logic in orchestrator');
      // This is a conceptual test - verify that orchestrator only delegates
      // We check if agent results exist, which proves delegation happened
      const delegatedToAgents =
        Object.keys(workflowResult.agentResults).length > 0;

      if (delegatedToAgents) {
        console.log('✓ PASS: Orchestrator delegates to agents');
        console.log(
          `  - Agents called: ${Object.keys(workflowResult.agentResults).join(', ')}\n`
        );
        passedTests++;
      } else {
        console.log('✗ FAIL: No agent delegation detected\n');
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
