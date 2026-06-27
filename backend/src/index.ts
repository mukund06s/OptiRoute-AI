import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health.routes';
import { hubsRouter } from './routes/hubs.routes';
import { routesRouter } from './routes/routes.routes';
import { shipmentsRouter } from './routes/shipments.routes';
import { routingRouter } from './routes/routing.routes';
import { workflowRouter } from './routes/workflow.routes';
import { cronManager } from './lib/cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api/hubs', hubsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/routing', routingRouter);
app.use('/api/workflow', workflowRouter);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`OptiRoute backend running on port ${PORT}`);
  
  // Start cron jobs
  try {
    await cronManager.start();
  } catch (error: any) {
    console.error('[Server] Failed to start cron jobs:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, stopping cron jobs...');
  cronManager.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, stopping cron jobs...');
  cronManager.stop();
  process.exit(0);
});

export default app;
