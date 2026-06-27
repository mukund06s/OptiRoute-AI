#!/usr/bin/env node
/**
 * CI test runner — executes all backend test scripts in a deterministic order.
 * Infrastructure only; does not modify business logic.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const unitTests = [
  'src/services/__tests__/webhook.service.test.ts',
  'src/services/__tests__/weather.test.ts',
  'src/services/agents/__tests__/supervisorAgent.test.ts',
  'src/services/agents/__tests__/weatherAgent.test.ts',
  'src/services/agents/__tests__/riskAgent.test.ts',
  'src/services/agents/__tests__/routingAgent.test.ts',
  'src/services/agents/__tests__/communicationAgent.test.ts',
  'src/services/agents/__tests__/langGraphOrchestrator.test.ts',
  'src/lib/__tests__/cron.test.ts',
];

const integrationTest = 'src/controllers/__tests__/workflow.controller.test.ts';

function runTest(relativePath) {
  console.log(`\n[CI] Running ${relativePath}`);
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', relativePath], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Test failed: ${relativePath}`);
  }
}

async function waitForBackendHealth(url, attempts = 30) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('[CI] Backend health check passed');
        return;
      }
    } catch {
      // retry
    }
    await delay(2000);
  }

  throw new Error('Backend health check failed during CI integration tests');
}

async function main() {
  if (!existsSync('dist/index.js')) {
    throw new Error('Backend build output missing: dist/index.js');
  }

  for (const testFile of unitTests) {
    runTest(testFile);
  }

  const server = spawn(process.execPath, ['dist/index.js'], {
    stdio: 'inherit',
    env: process.env,
  });

  try {
    await waitForBackendHealth('http://127.0.0.1:5000/api/health');
    runTest(integrationTest);
  } finally {
    if (server.pid) {
      server.kill('SIGTERM');
    }
  }

  console.log('\n[CI] All backend tests passed');
}

main().catch((error) => {
  console.error('[CI] Backend test run failed:', error.message);
  process.exit(1);
});
