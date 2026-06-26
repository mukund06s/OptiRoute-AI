/**
 * Weather Service Tests
 * Run with: npx tsx src/services/__tests__/weather.test.ts
 */

import { weatherService } from '../weather.service';
import { weatherCache } from '../weatherCache';
import { prisma } from '../../lib/prisma';

async function runTests() {
  console.log('\n============================================================');
  console.log('Weather Service - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Cache initialization');
    const initialStats = weatherCache.getStats();
    if (initialStats.hits === 0 && initialStats.misses === 0 && initialStats.size === 0) {
      console.log('✓ PASS\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    const hub = await prisma.hub.findFirst({ where: { isActive: true } });
    if (!hub) throw new Error('No active hubs found');

    totalTests++;
    console.log('[TEST 2] Fetch weather for single hub');
    const weather1 = await weatherService.getWeatherForHub(hub.id);
    if (weather1 && weather1.hubId === hub.id && weather1.condition) {
      console.log(`✓ PASS: ${weather1.condition} (${weather1.source})\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 3] Cache hit');
    const weather2 = await weatherService.getWeatherForHub(hub.id);
    if (weather2.source === 'cache') {
      console.log('✓ PASS: Cache hit detected\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Expected cache hit\n');
    }

    totalTests++;
    console.log('[TEST 4] Cache statistics');
    const stats = weatherCache.getStats();
    if (stats.hits > 0 && stats.hitRate > 0) {
      console.log(`✓ PASS: ${stats.hits} hits, ${(stats.hitRate * 100).toFixed(1)}% hit rate\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 5] Cache invalidation');
    const invalidated = weatherService.invalidateCache(hub.id);
    if (invalidated) {
      console.log('✓ PASS: Cache invalidated\n');
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 6] Fetch all hubs');
    const allWeather = await weatherService.getWeatherForAllHubs();
    if (allWeather.length > 0) {
      console.log(`✓ PASS: Fetched ${allWeather.length} hubs\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL\n');
    }

    totalTests++;
    console.log('[TEST 7] Weather normalization');
    const conditions = new Set(allWeather.map((w) => w.condition));
    const validConditions = [
      'Clear',
      'Partly Cloudy',
      'Cloudy',
      'Light Rain',
      'Rain',
      'Heavy Rain',
      'Thunderstorm',
      'Fog',
    ];
    const allValid = Array.from(conditions).every((c) => validConditions.includes(c));
    if (allValid) {
      console.log(`✓ PASS: ${conditions.size} normalized conditions\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid conditions found\n');
    }

    totalTests++;
    console.log('[TEST 8] Cache invalidate all');
    weatherService.invalidateAllCache();
    const finalStats = weatherCache.getStats();
    if (finalStats.size === 0) {
      console.log('✓ PASS: All cache cleared\n');
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
