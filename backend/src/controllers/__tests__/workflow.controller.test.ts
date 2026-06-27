/**
 * Workflow Controller Tests
 * Run with: npx tsx src/controllers/__tests__/workflow.controller.test.ts
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/workflow';

async function runTests() {
  console.log('\n============================================================');
  console.log('Workflow Controller - API Tests');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  try {
    totalTests++;
    console.log('[TEST 1] POST /api/workflow/execute - Valid shipment');
    try {
      const response = await axios.post(`${BASE_URL}/execute`, {
        shipmentId: 1,
      });

      if (response.status === 200 && response.data.success) {
        console.log('✓ PASS: Workflow executed successfully');
        console.log(`  - Workflow ID: ${response.data.workflowId}`);
        console.log(`  - Cycle ID: ${response.data.cycleId}`);
        console.log(`  - Overall status: ${response.data.overallStatus}`);
        console.log(`  - Execution time: ${response.data.executionTimeMs}ms`);
        console.log(`  - Steps executed: ${response.data.summary.stepsExecuted}`);
        console.log(`  - Steps skipped: ${response.data.summary.stepsSkipped}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.response?.data || error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 2] POST /api/workflow/execute - Invalid shipment');
    try {
      const response = await axios.post(`${BASE_URL}/execute`, {
        shipmentId: 99999,
      });
      console.log('✗ FAIL: Should have returned 404\n');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✓ PASS: Correctly returned 404 for invalid shipment');
        console.log(`  - Error: ${error.response.data.error}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Wrong status code\n');
      }
    }

    totalTests++;
    console.log('[TEST 3] POST /api/workflow/execute - Missing shipmentId');
    try {
      const response = await axios.post(`${BASE_URL}/execute`, {});
      console.log('✗ FAIL: Should have returned 400\n');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✓ PASS: Correctly returned 400 for missing shipmentId');
        console.log(`  - Error: Validation failed\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Wrong status code\n');
      }
    }

    totalTests++;
    console.log('[TEST 4] POST /api/workflow/execute-batch - Valid shipments');
    try {
      const response = await axios.post(`${BASE_URL}/execute-batch`, {
        shipmentIds: [1, 2],
      });

      if (response.status === 200) {
        console.log('✓ PASS: Batch workflow executed');
        console.log(`  - Total: ${response.data.total}`);
        console.log(`  - Completed: ${response.data.completed}`);
        console.log(`  - Failed: ${response.data.failed}`);
        console.log(`  - Not found: ${response.data.notFound}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.response?.data || error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 5] POST /api/workflow/execute-batch - Empty array');
    try {
      const response = await axios.post(`${BASE_URL}/execute-batch`, {
        shipmentIds: [],
      });
      console.log('✗ FAIL: Should have returned 400\n');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✓ PASS: Correctly returned 400 for empty array');
        console.log(`  - Error: Validation failed\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Wrong status code\n');
      }
    }

    totalTests++;
    console.log('[TEST 6] POST /api/workflow/execute-batch - Too many shipments');
    try {
      const shipmentIds = Array.from({ length: 101 }, (_, i) => i + 1);
      const response = await axios.post(`${BASE_URL}/execute-batch`, {
        shipmentIds,
      });
      console.log('✗ FAIL: Should have returned 400 (max 100)\n');
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('✓ PASS: Correctly returned 400 for >100 shipments');
        console.log(`  - Error: Validation failed\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Wrong status code\n');
      }
    }

    // Get workflow ID from first test for status check
    let workflowId: string | null = null;
    try {
      const response = await axios.post(`${BASE_URL}/execute`, {
        shipmentId: 1,
      });
      workflowId = response.data.workflowId;
    } catch (error) {
      console.log('[INFO] Could not get workflow ID for status tests\n');
    }

    if (workflowId) {
      totalTests++;
      console.log('[TEST 7] GET /api/workflow/status/:workflowId - Valid ID');
      try {
        const response = await axios.get(`${BASE_URL}/status/${workflowId}`);

        if (response.status === 200 && response.data.workflowId) {
          console.log('✓ PASS: Workflow status retrieved');
          console.log(`  - Workflow ID: ${response.data.workflowId}`);
          console.log(`  - State: ${response.data.state}`);
          console.log(`  - Total steps: ${response.data.totalSteps}`);
          console.log(`  - Completed steps: ${response.data.completedSteps}\n`);
          passedTests++;
        } else {
          console.log('✗ FAIL: Unexpected response\n');
        }
      } catch (error: any) {
        console.log('✗ FAIL:', error.response?.data || error.message, '\n');
      }
    } else {
      console.log('[SKIP] Test 7: No workflow ID available\n');
    }

    totalTests++;
    console.log('[TEST 8] GET /api/workflow/status/:workflowId - Invalid ID');
    try {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const response = await axios.get(`${BASE_URL}/status/${invalidId}`);
      console.log('✗ FAIL: Should have returned 404\n');
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('✓ PASS: Correctly returned 404 for invalid workflow ID\n');
        passedTests++;
      } else {
        console.log('✗ FAIL: Wrong status code\n');
      }
    }

    totalTests++;
    console.log('[TEST 9] GET /api/workflow/history - Default parameters');
    try {
      const response = await axios.get(`${BASE_URL}/history`);

      if (response.status === 200 && Array.isArray(response.data.workflows)) {
        console.log('✓ PASS: Workflow history retrieved');
        console.log(`  - Total: ${response.data.total}`);
        console.log(`  - Count: ${response.data.count}`);
        console.log(`  - Limit: ${response.data.limit}`);
        console.log(`  - Offset: ${response.data.offset}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.response?.data || error.message, '\n');
    }

    totalTests++;
    console.log('[TEST 10] GET /api/workflow/history - With filters');
    try {
      const response = await axios.get(`${BASE_URL}/history`, {
        params: {
          limit: 10,
          offset: 0,
          status: 'completed',
        },
      });

      if (response.status === 200) {
        console.log('✓ PASS: Filtered workflow history retrieved');
        console.log(`  - Limit: ${response.data.limit}`);
        console.log(`  - Offset: ${response.data.offset}`);
        console.log(`  - Count: ${response.data.count}\n`);
        passedTests++;
      } else {
        console.log('✗ FAIL: Unexpected response\n');
      }
    } catch (error: any) {
      console.log('✗ FAIL:', error.response?.data || error.message, '\n');
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

console.log('[INFO] Make sure the backend server is running on port 5000');
console.log('[INFO] Run: npm run dev\n');

runTests();
