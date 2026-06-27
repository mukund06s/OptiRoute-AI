/**
 * Risk Agent Tests
 * Run with: npx tsx src/services/agents/__tests__/riskAgent.test.ts
 */

import { riskAgent, ShipmentContext } from '../riskAgent';
import { WeatherAgentResult } from '../weatherAgent';
import { prisma } from '../../../lib/prisma';

async function runTests() {
  console.log('\n============================================================');
  console.log('Risk Agent - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Initialize risk agent');
    const initialized = await riskAgent.initialize();
    if (initialized && riskAgent.isInitialized()) {
      console.log('✓ PASS: Risk agent initialized');
      console.log(`  - ML Service available: ${riskAgent.isMlServiceAvailable()}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 2] Execute risk agent for shipment');
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

      const step = {
        agent: 'risk' as const,
        state: 'running' as const,
        retryCount: 0,
        maxRetries: 3,
      };

      const mockWeatherResult: WeatherAgentResult = {
        success: true,
        hubsProcessed: 2,
        weatherData: [
          {
            hubId: context.currentHubId || 1,
            hubName: 'Test Hub',
            condition: 'Clear',
            conditionCode: 800,
            temperature: 25,
            feelsLike: 25,
            humidity: 60,
            precipitationMm: 0,
            windSpeedKmh: 15,
            visibilityKm: 10,
            forecastFor: new Date(),
            fetchedAt: new Date(),
            source: 'api',
          },
        ],
        impactAssessment: {
          highestImpact: 'LOW',
          criticalHubs: [],
          highRiskHubs: [],
          mediumRiskHubs: [],
          lowRiskHubs: [1],
        },
        recommendations: [],
        confidence: 0.9,
        metadata: {
          executionTimeMs: 100,
          cacheHitRate: 0.5,
          failedHubs: [],
          source: 'weather_service',
        },
        errors: [],
      };

      const result = await riskAgent.execute(context, step, mockWeatherResult);

      if (result.success && result.hubsProcessed >= 0) {
        console.log('✓ PASS: Risk agent executed successfully');
        console.log(`  - Hubs processed: ${result.hubsProcessed}`);
        console.log(`  - Overall risk: ${result.overallRisk.highestRisk}`);
        console.log(`  - Confidence: ${result.confidence}`);
        console.log(`  - Recommendations: ${result.recommendations.length}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL\n');
      }
    }

    totalTests++;
    console.log('[TEST 3] Risk categorization - Critical');
    const criticalRiskScores = [
      {
        hubId: 1,
        hubName: 'Test Hub',
        predictedRisk: 'critical' as const,
        confidence: 0.92,
        delayProbability: 0.9,
        shapExplanation: {
          topFeatures: [],
          positiveContributors: [],
          negativeContributors: [],
          humanExplanation: 'Critical risk detected',
        },
        recommendation: 'CRITICAL: Immediate action required',
      },
    ];

    const criticalResult = await riskAgent.generateResult(criticalRiskScores);
    if (criticalResult.overallRisk.highestRisk === 'critical') {
      console.log('✓ PASS: Critical risk categorized correctly\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected critical risk\n');
    }

    totalTests++;
    console.log('[TEST 4] Risk categorization - High');
    const highRiskScores = [
      {
        ...criticalRiskScores[0],
        predictedRisk: 'high' as const,
        confidence: 0.85,
        delayProbability: 0.7,
      },
    ];

    const highResult = await riskAgent.generateResult(highRiskScores);
    if (highResult.overallRisk.highestRisk === 'high') {
      console.log('✓ PASS: High risk categorized correctly\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected high risk\n');
    }

    totalTests++;
    console.log('[TEST 5] Risk categorization - Medium');
    const mediumRiskScores = [
      {
        ...criticalRiskScores[0],
        predictedRisk: 'medium' as const,
        confidence: 0.75,
        delayProbability: 0.4,
      },
    ];

    const mediumResult = await riskAgent.generateResult(mediumRiskScores);
    if (mediumResult.overallRisk.highestRisk === 'medium') {
      console.log('✓ PASS: Medium risk categorized correctly\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected medium risk\n');
    }

    totalTests++;
    console.log('[TEST 6] Risk categorization - Low');
    const lowRiskScores = [
      {
        ...criticalRiskScores[0],
        predictedRisk: 'low' as const,
        confidence: 0.9,
        delayProbability: 0.1,
      },
    ];

    const lowResult = await riskAgent.generateResult(lowRiskScores);
    if (lowResult.overallRisk.highestRisk === 'low') {
      console.log('✓ PASS: Low risk categorized correctly\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected low risk\n');
    }

    totalTests++;
    console.log('[TEST 7] Confidence calculation');
    const mixedRiskScores = [
      { ...criticalRiskScores[0], confidence: 0.9 },
      { ...criticalRiskScores[0], confidence: 0.8 },
      { ...criticalRiskScores[0], confidence: 0.7 },
    ];

    const confResult = await riskAgent.generateResult(mixedRiskScores);
    if (confResult.confidence > 0 && confResult.confidence <= 1) {
      console.log(`✓ PASS: Confidence calculated: ${confResult.confidence}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 8] Result structure validation');
    if (
      confResult.success !== undefined &&
      confResult.hubsProcessed >= 0 &&
      Array.isArray(confResult.riskScores) &&
      confResult.overallRisk &&
      Array.isArray(confResult.recommendations)
    ) {
      console.log('✓ PASS: Result structure is valid\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid result structure\n');
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
