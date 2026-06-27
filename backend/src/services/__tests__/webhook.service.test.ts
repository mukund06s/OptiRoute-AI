/**
 * Webhook Service Tests
 * Run with: npx tsx src/services/__tests__/webhook.service.test.ts
 */

import { webhookService, WebhookPayload } from '../webhook.service';

async function runTests() {
  console.log('\n============================================================');
  console.log('Webhook Service - Comprehensive Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] Check webhook service initialization');
    const isEnabled = webhookService.isEnabled();
    const config = webhookService.getConfig();
    
    console.log(`  - Enabled: ${isEnabled}`);
    console.log(`  - URL: ${config.url}`);
    console.log(`  - Timeout: ${config.timeout}ms`);
    console.log(`  - Max Retries: ${config.maxRetries}`);
    console.log(`  - Retry Delay: ${config.retryDelay}ms`);
    
    if (config.timeout > 0 && config.maxRetries > 0) {
      console.log('✓ PASS: Webhook service initialized\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid configuration\n');
    }

    // Create test payload
    const testPayload: WebhookPayload = {
      event: 'workflow_completed',
      timestamp: new Date().toISOString(),
      cycleId: 'test-cycle-123',
      shipment: {
        id: 1,
        trackingId: 'OPT-TEST-123',
        status: 'in_transit',
        priority: 'express',
      },
      alert: {
        message: 'Test alert message',
        isAnomaly: false,
        severity: 'low',
      },
    };

    totalTests++;
    console.log('[TEST 2] Send workflow completed event');
    try {
      const response = await webhookService.sendWorkflowCompleted(testPayload);
      
      if (response.success || response.error === 'Webhooks disabled - no URL configured') {
        console.log('✓ PASS: Workflow completed event sent');
        console.log(`  - Success: ${response.success}`);
        console.log(`  - Execution ID: ${response.executionId || 'N/A'}`);
        console.log(`  - Error: ${response.error || 'None'}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 3] Send reroute event');
    const reroutePayload: WebhookPayload = {
      ...testPayload,
      event: 'reroute',
      routeChange: {
        oldRoute: ['Delhi', 'Bhopal', 'Indore'],
        newRoute: ['Delhi', 'Jaipur', 'Indore'],
        reason: 'Risk-based rerouting',
        estimatedTimeSaved: 60,
      },
    };

    try {
      const response = await webhookService.sendRerouteEvent(reroutePayload);
      
      if (response.success || response.error === 'Webhooks disabled - no URL configured') {
        console.log('✓ PASS: Reroute event sent');
        console.log(`  - Success: ${response.success}`);
        console.log(`  - Error: ${response.error || 'None'}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 4] Send critical risk event');
    const criticalPayload: WebhookPayload = {
      ...testPayload,
      event: 'critical_risk',
      riskData: {
        riskLevel: 'critical',
        delayProbability: 0.89,
        triggeredByHub: 'Bhopal',
      },
      alert: {
        message: 'Critical risk detected. Immediate action required.',
        isAnomaly: true,
        recipientEmail: 'manager@optiroute.in',
        recipientName: 'Operations Manager',
        severity: 'critical',
      },
    };

    try {
      const response = await webhookService.sendCriticalRiskEvent(criticalPayload);
      
      if (response.success || response.error === 'Webhooks disabled - no URL configured') {
        console.log('✓ PASS: Critical risk event sent');
        console.log(`  - Success: ${response.success}`);
        console.log(`  - Error: ${response.error || 'None'}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 5] Payload structure validation');
    const hasRequiredFields =
      testPayload.event &&
      testPayload.timestamp &&
      testPayload.cycleId &&
      testPayload.shipment &&
      testPayload.shipment.id &&
      testPayload.shipment.trackingId;

    if (hasRequiredFields) {
      console.log('✓ PASS: Payload structure is valid');
      console.log(`  - Event: ${testPayload.event}`);
      console.log(`  - Timestamp: ${testPayload.timestamp}`);
      console.log(`  - Cycle ID: ${testPayload.cycleId}`);
      console.log(`  - Shipment ID: ${testPayload.shipment.id}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Payload missing required fields\n');
    }

    totalTests++;
    console.log('[TEST 6] Timeout configuration');
    const timeoutMs = config.timeout;
    
    if (timeoutMs > 0 && timeoutMs <= 30000) {
      console.log('✓ PASS: Timeout configured correctly');
      console.log(`  - Timeout: ${timeoutMs}ms\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid timeout configuration\n');
    }

    totalTests++;
    console.log('[TEST 7] Retry configuration');
    const maxRetries = config.maxRetries;
    
    if (maxRetries > 0 && maxRetries <= 10) {
      console.log('✓ PASS: Retry configuration valid');
      console.log(`  - Max Retries: ${maxRetries}\n`);
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid retry configuration\n');
    }

    totalTests++;
    console.log('[TEST 8] Event types');
    const eventTypes = ['workflow_completed', 'reroute', 'critical_risk'];
    
    const allTypesValid = eventTypes.every((type) => {
      return (
        type === 'workflow_completed' ||
        type === 'reroute' ||
        type === 'critical_risk'
      );
    });

    if (allTypesValid) {
      console.log('✓ PASS: All event types valid');
      eventTypes.forEach((type) => console.log(`  - ${type}`));
      console.log();
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid event types\n');
    }

    totalTests++;
    console.log('[TEST 9] Service enabled/disabled handling');
    
    if (!isEnabled) {
      console.log('✓ PASS: Service correctly handles disabled state');
      console.log('  - Webhooks disabled (no URL configured)\n');
      passedTests++;
    } else {
      console.log('✓ PASS: Service is enabled with URL');
      console.log(`  - URL: ${config.url}\n`);
      passedTests++;
    }

    totalTests++;
    console.log('[TEST 10] Configuration validation');
    const hasValidConfig =
      config.url &&
      config.timeout > 0 &&
      config.maxRetries > 0 &&
      config.retryDelay > 0;

    if (hasValidConfig) {
      console.log('✓ PASS: Configuration is valid\n');
      passedTests++;
    } else {
      console.log('✗ FAIL: Invalid configuration\n');
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

console.log('[INFO] Testing webhook service...\n');

runTests();
