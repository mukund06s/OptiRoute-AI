/**
 * Communication Agent Tests
 * Run with: npx tsx src/services/agents/__tests__/communicationAgent.test.ts
 */

import { communicationAgent, ShipmentContext } from '../communicationAgent';
import { WeatherAgentResult } from '../weatherAgent';
import { RiskAgentResult } from '../riskAgent';
import { RoutingAgentResult } from '../routingAgent';

async function runTests() {
  console.log('\n============================================================');
  console.log('Communication Agent - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Initialize communication agent');
    const initialized = await communicationAgent.initialize();
    if (initialized && communicationAgent.isInitialized()) {
      console.log('✓ PASS: Communication agent initialized\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    const testContext: ShipmentContext = {
      shipmentId: 1,
      trackingId: 'OPT-TEST123',
      currentHubId: 1,
      destinationHubId: 5,
      activeRoute: [1, 2, 3, 4, 5],
      priority: 'express',
    };

    const mockWeatherResult: WeatherAgentResult = {
      success: true,
      hubsProcessed: 3,
      weatherData: [],
      impactAssessment: {
        highestImpact: 'HIGH',
        criticalHubs: [],
        highRiskHubs: [3],
        mediumRiskHubs: [],
        lowRiskHubs: [1, 5],
      },
      recommendations: ['High risk weather detected'],
      confidence: 0.85,
      metadata: {
        executionTimeMs: 100,
        cacheHitRate: 0.5,
        failedHubs: [],
        source: 'weather_agent',
      },
      errors: [],
    };

    const mockRiskResult: RiskAgentResult = {
      success: true,
      hubsProcessed: 3,
      riskScores: [],
      overallRisk: {
        highestRisk: 'high',
        criticalHubs: [],
        highRiskHubs: [3],
        mediumRiskHubs: [2],
        lowRiskHubs: [1, 5],
      },
      recommendations: ['High risk detected'],
      confidence: 0.82,
      metadata: {
        executionTimeMs: 200,
        mlServiceAvailable: true,
        failedHubs: [],
        source: 'risk_agent',
      },
      errors: [],
    };

    const mockRoutingResult: RoutingAgentResult = {
      success: true,
      shipmentsProcessed: 1,
      routeChanges: [
        {
          shipmentId: 1,
          trackingId: 'OPT-TEST123',
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
          estimatedTimeSaved: 60,
          estimatedDistanceChange: -150,
        },
      ],
      summary: {
        totalRerouted: 1,
        totalUnchanged: 0,
        totalFailed: 0,
      },
      recommendations: [],
      metadata: {
        executionTimeMs: 300,
        routingEngineAvailable: true,
        failedShipments: [],
        source: 'routing_agent',
      },
      errors: [],
    };

    totalTests++;
    console.log('[TEST 2] Build summary');
    const summary = communicationAgent.buildSummary(
      mockWeatherResult,
      mockRiskResult,
      mockRoutingResult
    );
    if (summary.weather && summary.risk && summary.routing) {
      console.log('✓ PASS: Summary built');
      console.log(`  - Weather: ${summary.weather}`);
      console.log(`  - Risk: ${summary.risk}`);
      console.log(`  - Routing: ${summary.routing}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 3] Build shipment message');
    const shipmentMessage = communicationAgent.buildShipmentMessage(
      testContext,
      mockWeatherResult,
      mockRiskResult,
      mockRoutingResult
    );
    if (shipmentMessage && shipmentMessage.subject && shipmentMessage.body) {
      console.log('✓ PASS: Shipment message generated');
      console.log(`  - Subject: ${shipmentMessage.subject}`);
      console.log(`  - Severity: ${shipmentMessage.severity}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 4] Build operations message');
    const operationsMessage = communicationAgent.buildOperationsMessage(
      testContext,
      mockWeatherResult,
      mockRiskResult,
      mockRoutingResult,
      summary
    );
    if (
      operationsMessage &&
      operationsMessage.subject &&
      operationsMessage.body
    ) {
      console.log('✓ PASS: Operations message generated');
      console.log(`  - Subject: ${operationsMessage.subject.substring(0, 60)}...`);
      console.log(`  - Action required: ${operationsMessage.actionRequired}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 5] Build audit log');
    const auditLog = communicationAgent.buildAuditLog(
      testContext,
      mockWeatherResult,
      mockRiskResult,
      mockRoutingResult,
      150
    );
    if (auditLog && auditLog.agentName === 'communication') {
      console.log('✓ PASS: Audit log created');
      console.log(`  - Action: ${auditLog.action}`);
      console.log(`  - Status: ${auditLog.status}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 6] Severity calculation - Critical');
    const criticalRiskResult: RiskAgentResult = {
      ...mockRiskResult,
      overallRisk: {
        highestRisk: 'critical',
        criticalHubs: [2, 3],
        highRiskHubs: [],
        mediumRiskHubs: [],
        lowRiskHubs: [],
      },
    };

    const step = {
      agent: 'communication' as const,
      state: 'running' as const,
      retryCount: 0,
      maxRetries: 3,
    };

    const criticalResult = await communicationAgent.execute(
      testContext,
      step,
      mockWeatherResult,
      criticalRiskResult,
      mockRoutingResult
    );

    if (criticalResult.severity === 'critical') {
      console.log('✓ PASS: Critical severity calculated correctly\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected critical severity\n');
    }

    totalTests++;
    console.log('[TEST 7] Anomaly detection');
    if (criticalResult.anomalyDetected) {
      console.log('✓ PASS: Anomaly detected (multiple critical hubs)');
      console.log(
        `  - Pattern: ${criticalResult.anomalyDetails?.pattern.substring(0, 60)}...\n`
      );
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected anomaly detection\n');
    }

    totalTests++;
    console.log('[TEST 8] Recommendations generation');
    if (
      criticalResult.recommendations &&
      criticalResult.recommendations.length > 0
    ) {
      console.log('✓ PASS: Recommendations generated');
      console.log(`  - Count: ${criticalResult.recommendations.length}`);
      console.log(`  - First: ${criticalResult.recommendations[0].substring(0, 60)}...\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 9] Execute communication agent');
    const executeResult = await communicationAgent.execute(
      testContext,
      step,
      mockWeatherResult,
      mockRiskResult,
      mockRoutingResult
    );

    if (executeResult.success && executeResult.messagesGenerated > 0) {
      console.log('✓ PASS: Communication agent executed');
      console.log(`  - Messages: ${executeResult.messagesGenerated}`);
      console.log(`  - Severity: ${executeResult.severity}`);
      console.log(`  - Immediate action: ${executeResult.requiresImmediateAction}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 10] Result structure validation');
    if (
      executeResult.shipmentMessage &&
      executeResult.operationsMessage &&
      executeResult.auditLog &&
      executeResult.recommendations
    ) {
      console.log('✓ PASS: Result structure is complete\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Incomplete result structure\n');
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
