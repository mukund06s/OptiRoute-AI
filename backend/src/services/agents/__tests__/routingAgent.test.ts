/**
 * Routing Agent Tests
 * Run with: npx tsx src/services/agents/__tests__/routingAgent.test.ts
 */

import { routingAgent, ShipmentContext, RouteChangeData } from '../routingAgent';
import { RiskAgentResult } from '../riskAgent';
import { prisma } from '../../../lib/prisma';

async function runTests() {
  console.log('\n============================================================');
  console.log('Routing Agent - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Initialize routing agent');
    const initialized = await routingAgent.initialize();
    if (initialized && routingAgent.isInitialized()) {
      console.log('✓ PASS: Routing agent initialized\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 2] Analyze current route');
    const shipment = await prisma.shipment.findFirst({
      where: { status: 'in_transit' },
    });

    if (!shipment) {
      console.log('⚠ SKIP: No in-transit shipments found\n');
    } else {
      const context: ShipmentContext = {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        currentHubId: shipment.currentHubId,
        destinationHubId: shipment.destinationHubId,
        activeRoute: (shipment.activeRoute as any) || [],
        priority: shipment.priority,
      };

      const analysis = await routingAgent.analyzeCurrentRoute(context);
      if (analysis && analysis.hasRoute !== undefined) {
        console.log('✓ PASS: Route analyzed');
        console.log(`  - Has route: ${analysis.hasRoute}`);
        console.log(`  - Route length: ${analysis.routeLength}`);
        console.log(`  - Current position: ${analysis.currentHubPosition}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL\n');
      }
    }

    totalTests++;
    console.log('[TEST 3] Evaluate reroute - No risk data');
    const noRiskContext: ShipmentContext = {
      shipmentId: 1,
      trackingId: 'TEST-001',
      currentHubId: 1,
      destinationHubId: 5,
      activeRoute: [1, 2, 3, 4, 5],
      priority: 'standard',
    };

    const noRiskDecision = await routingAgent.evaluateReroute(noRiskContext);
    if (!noRiskDecision) {
      console.log('✓ PASS: No reroute when risk data unavailable\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 4] Evaluate reroute - Critical risk');
    const criticalRiskResult: RiskAgentResult = {
      success: true,
      hubsProcessed: 3,
      riskScores: [],
      overallRisk: {
        highestRisk: 'critical',
        criticalHubs: [3],
        highRiskHubs: [],
        mediumRiskHubs: [],
        lowRiskHubs: [],
      },
      recommendations: [],
      confidence: 0.9,
      metadata: {
        executionTimeMs: 100,
        mlServiceAvailable: true,
        failedHubs: [],
        source: 'risk_agent',
      },
      errors: [],
    };

    const criticalDecision = await routingAgent.evaluateReroute(
      noRiskContext,
      criticalRiskResult
    );
    if (criticalDecision) {
      console.log('✓ PASS: Reroute required for critical risk\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 5] Evaluate reroute - High risk');
    const highRiskResult: RiskAgentResult = {
      ...criticalRiskResult,
      overallRisk: {
        highestRisk: 'high',
        criticalHubs: [],
        highRiskHubs: [3],
        mediumRiskHubs: [],
        lowRiskHubs: [],
      },
    };

    const highDecision = await routingAgent.evaluateReroute(
      noRiskContext,
      highRiskResult
    );
    if (highDecision) {
      console.log('✓ PASS: Reroute required for high risk\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 6] Evaluate reroute - Low risk');
    const lowRiskResult: RiskAgentResult = {
      ...criticalRiskResult,
      overallRisk: {
        highestRisk: 'low',
        criticalHubs: [],
        highRiskHubs: [],
        mediumRiskHubs: [],
        lowRiskHubs: [1, 2, 3, 4, 5],
      },
    };

    const lowDecision = await routingAgent.evaluateReroute(noRiskContext, lowRiskResult);
    if (!lowDecision) {
      console.log('✓ PASS: No reroute for low risk\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 7] Generate result structure');
    const testRouteChanges: RouteChangeData[] = [
      {
        shipmentId: 1,
        trackingId: 'TEST-001',
        rerouted: true,
        oldRoute: [1, 2, 3, 4, 5],
        newRoute: [1, 6, 7, 5],
        oldRouteNames: ['Hub1', 'Hub2', 'Hub3', 'Hub4', 'Hub5'],
        newRouteNames: ['Hub1', 'Hub6', 'Hub7', 'Hub5'],
        routeDifference: {
          hubsAdded: [6, 7],
          hubsRemoved: [2, 3, 4],
          sequenceChanged: true,
        },
        reason: 'Risk-based rerouting',
        estimatedTimeSaved: 30,
        estimatedDistanceChange: -100,
      },
    ];

    const result = await routingAgent.generateResult(testRouteChanges);
    if (
      result.success &&
      result.shipmentsProcessed === 1 &&
      result.summary.totalRerouted === 1
    ) {
      console.log('✓ PASS: Result structure valid');
      console.log(`  - Rerouted: ${result.summary.totalRerouted}`);
      console.log(`  - Unchanged: ${result.summary.totalUnchanged}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 8] Execute routing agent (no reroute needed)');
    if (shipment) {
      const context: ShipmentContext = {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        currentHubId: shipment.currentHubId,
        destinationHubId: shipment.destinationHubId,
        activeRoute: (shipment.activeRoute as any) || [],
        priority: shipment.priority,
      };

      const step = {
        agent: 'routing' as const,
        state: 'running' as const,
        retryCount: 0,
        maxRetries: 3,
      };

      const executeResult = await routingAgent.execute(context, step, lowRiskResult);

      if (executeResult.success) {
        console.log('✓ PASS: Routing agent executed');
        console.log(`  - Changes: ${executeResult.summary.totalRerouted}`);
        console.log(`  - Unchanged: ${executeResult.summary.totalUnchanged}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL\n');
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
