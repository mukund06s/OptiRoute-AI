/**
 * Weather Agent Tests
 * Run with: npx tsx src/services/agents/__tests__/weatherAgent.test.ts
 */

import { weatherAgent, ShipmentContext } from '../weatherAgent';
import { prisma } from '../../../lib/prisma';

async function runTests() {
  console.log('\n============================================================');
  console.log('Weather Agent - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Initialize weather agent');
    const initialized = await weatherAgent.initialize();
    if (initialized && weatherAgent.isInitialized()) {
      console.log('✓ PASS: Weather agent initialized\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 2] Execute weather agent for shipment');
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
        agent: 'weather' as const,
        state: 'running' as const,
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await weatherAgent.execute(context, step);

      if (result.success && result.hubsProcessed > 0) {
        console.log('✓ PASS: Weather agent executed successfully');
        console.log(`  - Hubs processed: ${result.hubsProcessed}`);
        console.log(`  - Highest impact: ${result.impactAssessment.highestImpact}`);
        console.log(`  - Confidence: ${result.confidence}`);
        console.log(`  - Recommendations: ${result.recommendations.length}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL\n');
      }
    }

    totalTests++;
    console.log('[TEST 3] Collect weather for multiple hubs');
    const testContext: ShipmentContext = {
      shipmentId: 1,
      trackingId: 'TEST-001',
      currentHubId: 1,
      destinationHubId: 5,
      activeRoute: [1, 2, 3, 4, 5],
      priority: 'express',
    };

    const weatherData = await weatherAgent.collectWeather(testContext);
    if (weatherData.length > 0) {
      console.log('✓ PASS: Weather collected');
      console.log(`  - Hubs: ${weatherData.length}`);
      weatherData.slice(0, 3).forEach((w) => {
        console.log(`    • ${w.hubName}: ${w.condition} (${w.source})`);
      });
      console.log();
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 4] Evaluate weather impact - Critical');
    const criticalWeather = {
      hubId: 1,
      hubName: 'Test Hub',
      condition: 'Thunderstorm',
      conditionCode: 200,
      temperature: 30,
      feelsLike: 32,
      humidity: 80,
      precipitationMm: 20,
      windSpeedKmh: 70,
      visibilityKm: 2,
      forecastFor: new Date(),
      fetchedAt: new Date(),
      source: 'api' as const,
    };

    const criticalImpact = weatherAgent.evaluateWeatherImpact(criticalWeather);
    if (criticalImpact.impactLevel === 'CRITICAL') {
      console.log('✓ PASS: Critical impact detected for thunderstorm');
      console.log(`  - Risk factors: ${criticalImpact.riskFactors.join(', ')}`);
      console.log(`  - Recommendation: ${criticalImpact.recommendation.substring(0, 60)}...\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected CRITICAL impact\n');
    }

    totalTests++;
    console.log('[TEST 5] Evaluate weather impact - High');
    const highRiskWeather = {
      ...criticalWeather,
      condition: 'Rain',
      precipitationMm: 8,
      windSpeedKmh: 50,
    };

    const highImpact = weatherAgent.evaluateWeatherImpact(highRiskWeather);
    if (highImpact.impactLevel === 'HIGH') {
      console.log('✓ PASS: High impact detected for rain\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected HIGH impact\n');
    }

    totalTests++;
    console.log('[TEST 6] Evaluate weather impact - Medium');
    const mediumRiskWeather = {
      ...criticalWeather,
      condition: 'Cloudy',
      precipitationMm: 0,
      windSpeedKmh: 30,
      visibilityKm: 4,
    };

    const mediumImpact = weatherAgent.evaluateWeatherImpact(mediumRiskWeather);
    if (mediumImpact.impactLevel === 'MEDIUM') {
      console.log('✓ PASS: Medium impact detected for cloudy conditions\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected MEDIUM impact\n');
    }

    totalTests++;
    console.log('[TEST 7] Evaluate weather impact - Low');
    const lowRiskWeather = {
      ...criticalWeather,
      condition: 'Clear',
      precipitationMm: 0,
      windSpeedKmh: 15,
      visibilityKm: 10,
      temperature: 25,
    };

    const lowImpact = weatherAgent.evaluateWeatherImpact(lowRiskWeather);
    if (lowImpact.impactLevel === 'LOW') {
      console.log('✓ PASS: Low impact detected for clear conditions\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected LOW impact\n');
    }

    totalTests++;
    console.log('[TEST 8] Weather update (cache invalidation)');
    const updateResult = await weatherAgent.updateWeather([1, 2]);
    if (updateResult.length > 0) {
      console.log('✓ PASS: Weather updated');
      console.log(`  - Updated hubs: ${updateResult.length}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 9] Confidence calculation');
    const mixedWeatherData = [
      { ...criticalWeather, source: 'api' as const },
      { ...criticalWeather, source: 'cache' as const },
      { ...criticalWeather, source: 'database' as const },
      { ...criticalWeather, source: 'mock' as const },
    ];
    const analyses = mixedWeatherData.map((w) =>
      weatherAgent.evaluateWeatherImpact(w)
    );
    const result = await weatherAgent.generateResult(mixedWeatherData, analyses);
    if (result.confidence > 0 && result.confidence <= 1) {
      console.log(`✓ PASS: Confidence calculated: ${result.confidence}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 10] Recommendations generation');
    if (result.recommendations.length > 0) {
      console.log('✓ PASS: Recommendations generated');
      console.log(`  - Count: ${result.recommendations.length}`);
      console.log(`  - Sample: ${result.recommendations[0].substring(0, 60)}...\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
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
