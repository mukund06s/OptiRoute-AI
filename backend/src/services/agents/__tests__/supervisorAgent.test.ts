/**
 * Supervisor Agent Tests
 * Run with: npx tsx src/services/agents/__tests__/supervisorAgent.test.ts
 */

import { supervisorAgent } from '../supervisorAgent';
import { prisma } from '../../../lib/prisma';

async function runTests() {
  console.log('\n============================================================');
  console.log('Supervisor Agent - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Initialize supervisor agent');
    const cycleId = await supervisorAgent.initialize();
    if (cycleId && cycleId.length > 0) {
      console.log(`✓ PASS: Cycle ID ${cycleId.substring(0, 8)}...\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 2] Evaluate shipment');
    const shipment = await prisma.shipment.findFirst({
      where: { status: 'in_transit' },
    });

    if (!shipment) {
      console.log('⚠ SKIP: No in-transit shipments found\n');
    } else {
      const evaluation = await supervisorAgent.evaluateShipment(shipment.id);
      if (
        evaluation &&
        evaluation.shipmentId === shipment.id &&
        evaluation.trackingId === shipment.trackingId
      ) {
        console.log(`✓ PASS: Evaluated shipment ${evaluation.trackingId}`);
        console.log(
          `  - In transit: ${evaluation.inTransit}, Needs evaluation: ${evaluation.needsEvaluation}`
        );
        console.log(`  - Risk factors: ${evaluation.riskFactors.join(', ')}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL\n');
      }
    }

    totalTests++;
    console.log('[TEST 3] Determine workflow for high-risk scenario');
    const highRiskEvaluation = {
      shipmentId: 1,
      trackingId: 'TEST-001',
      status: 'in_transit',
      currentHubId: 1,
      destinationHubId: 5,
      activeRoute: [1, 2, 3, 4, 5],
      needsEvaluation: true,
      riskFactors: ['hub_risk_critical', 'shipment_in_transit'],
      inTransit: true,
    };

    const workflow = await supervisorAgent.determineWorkflow(highRiskEvaluation);
    if (
      workflow.requiresWeather &&
      workflow.requiresRisk &&
      workflow.requiresRouting &&
      workflow.requiresCommunication &&
      workflow.priority === 'critical'
    ) {
      console.log('✓ PASS: Critical risk workflow detected');
      console.log(`  - Reason: ${workflow.reason}`);
      console.log(`  - Priority: ${workflow.priority}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Workflow determination incorrect\n');
    }

    totalTests++;
    console.log('[TEST 4] Create execution plan');
    const plan = await supervisorAgent.createExecutionPlan(workflow, 1);
    if (
      plan &&
      plan.planId &&
      plan.steps.length === 4 &&
      plan.state === 'pending'
    ) {
      console.log(`✓ PASS: Execution plan created`);
      console.log(`  - Plan ID: ${plan.planId.substring(0, 8)}...`);
      console.log(`  - Total steps: ${plan.totalSteps}`);
      plan.steps.forEach((step, idx) => {
        console.log(
          `    ${idx + 1}. ${step.agent} [${step.state}]${step.condition ? ` - Conditional` : ''}`
        );
      });
      console.log();
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 5] Execute plan');
    const executedPlan = await supervisorAgent.executePlan(plan.planId);
    if (executedPlan.state === 'running') {
      console.log('✓ PASS: Plan execution started\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 6] Update step state');
    await supervisorAgent.updateStepState(
      plan.planId,
      'weather',
      'completed',
      undefined,
      { hubsProcessed: 8 }
    );
    const updatedPlan = await supervisorAgent.getExecutionStatus(plan.planId);
    if (
      updatedPlan &&
      updatedPlan.steps[0].state === 'completed' &&
      updatedPlan.completedSteps === 1
    ) {
      console.log('✓ PASS: Step state updated');
      console.log(
        `  - Completed steps: ${updatedPlan.completedSteps}/${updatedPlan.totalSteps}\n`
      );
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 7] Get execution status');
    const status = await supervisorAgent.getExecutionStatus(plan.planId);
    if (status && status.planId === plan.planId) {
      console.log('✓ PASS: Status retrieved');
      console.log(`  - State: ${status.state}`);
      console.log(
        `  - Progress: ${status.completedSteps}/${status.totalSteps}\n`
      );
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 8] Conditional workflow (no risk)');
    const lowRiskEvaluation = {
      shipmentId: 2,
      trackingId: 'TEST-002',
      status: 'in_transit',
      currentHubId: 1,
      destinationHubId: 2,
      activeRoute: [1, 2],
      needsEvaluation: true,
      riskFactors: ['shipment_in_transit'],
      inTransit: true,
    };

    const lowRiskWorkflow =
      await supervisorAgent.determineWorkflow(lowRiskEvaluation);
    if (
      lowRiskWorkflow.requiresWeather &&
      lowRiskWorkflow.requiresRisk &&
      !lowRiskWorkflow.requiresRouting &&
      !lowRiskWorkflow.requiresCommunication
    ) {
      console.log('✓ PASS: Low-risk workflow (weather + risk only)');
      console.log(`  - Reason: ${lowRiskWorkflow.reason}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 9] Skip workflow (not in transit)');
    const notInTransitEvaluation = {
      shipmentId: 3,
      trackingId: 'TEST-003',
      status: 'delivered',
      currentHubId: null,
      destinationHubId: 5,
      activeRoute: [],
      needsEvaluation: false,
      riskFactors: [],
      inTransit: false,
    };

    const skipWorkflow =
      await supervisorAgent.determineWorkflow(notInTransitEvaluation);
    if (
      !skipWorkflow.requiresWeather &&
      !skipWorkflow.requiresRisk &&
      !skipWorkflow.requiresRouting &&
      !skipWorkflow.requiresCommunication
    ) {
      console.log('✓ PASS: Workflow skipped for delivered shipment');
      console.log(`  - Reason: ${skipWorkflow.reason}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 10] Cancel execution plan');
    const cancelPlan = await supervisorAgent.createExecutionPlan(
      lowRiskWorkflow,
      2
    );
    const cancelled = await supervisorAgent.cancelPlan(
      cancelPlan.planId,
      'Test cancellation'
    );
    if (cancelled.state === 'cancelled' && cancelled.errors.length > 0) {
      console.log('✓ PASS: Plan cancelled successfully');
      console.log(`  - Reason: ${cancelled.errors[0]}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 11] Get active plan count');
    const count = supervisorAgent.getActivePlanCount();
    if (count >= 2) {
      console.log(`✓ PASS: Active plans tracked (${count} plans)\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 12] Error handling - invalid shipment');
    try {
      await supervisorAgent.evaluateShipment(999999);
      console.log('✗ FAIL: Should have thrown error\n');
    } catch (error: any) {
      if (error.message.includes('Shipment not found')) {
        console.log('✓ PASS: Error thrown for invalid shipment\n');
        passedTests++;
      } else {
        console.log('✗ FAIL: Wrong error\n');
      }
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
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
