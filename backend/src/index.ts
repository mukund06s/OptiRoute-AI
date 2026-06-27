import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';

import { env, getCorsOrigins } from './config/env';
import { cronManager } from './lib/cron';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import {
  apiRateLimiter,
  healthRateLimiter,
  workflowRateLimiter,
} from './middleware/rateLimit';
import { sanitizeInput } from './middleware/sanitize';
import { securityRequestLogger } from './middleware/securityRequestLogger';
import { healthRouter } from './routes/health.routes';
import { hubsRouter } from './routes/hubs.routes';
import { routesRouter } from './routes/routes.routes';
import { shipmentsRouter } from './routes/shipments.routes';
import { routingRouter } from './routes/routing.routes';
import { workflowRouter } from './routes/workflow.routes';

const app = express();
const PORT = env.PORT;

app.disable('x-powered-by');

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// 1. Security headers
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Response compression
app.use(compression());

// 3. Security request logging (4xx/5xx)
app.use(securityRequestLogger);

// 4. CORS
const corsOrigins = getCorsOrigins();
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
  })
);

// 5. HTTP Parameter Pollution protection
app.use(hpp());

// 6. Body parsing with size limit
app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.JSON_BODY_LIMIT }));

// 7. Input sanitization
app.use(sanitizeInput);

// 8. Rate limiting (per route group — avoids double-counting)
app.use('/api/health', healthRateLimiter);
app.use('/api/hubs', apiRateLimiter, hubsRouter);
app.use('/api/routes', apiRateLimiter, routesRouter);
app.use('/api/shipments', apiRateLimiter, shipmentsRouter);
app.use('/api/routing', apiRateLimiter, routingRouter);
app.use('/api/workflow', workflowRateLimiter, workflowRouter);

// Routes (API contracts unchanged)
app.use('/api', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`OptiRoute backend running on port ${PORT} (${env.NODE_ENV})`);

  if (env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    console.warn('[Security] CORS_ORIGINS is not configured for production');
  }

  try {
    await cronManager.start();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Server] Failed to start cron jobs:', message);
  }
});

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
