import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { securityLog } from '../lib/securityLogger';

function createLimiter(max: number, windowMs: number = env.RATE_LIMIT_WINDOW_MS) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      securityLog('rate_limit_exceeded', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
      });
      res.status(429).json({ error: 'Too many requests' });
    },
  });
}

/** General limit for public API routes */
export const apiRateLimiter = createLimiter(env.RATE_LIMIT_MAX);

/** Stricter limit for workflow execution endpoints */
export const workflowRateLimiter = createLimiter(env.RATE_LIMIT_STRICT_MAX, 60 * 1000);

/** Health checks — higher threshold to avoid blocking probes */
export const healthRateLimiter = createLimiter(300, 60 * 1000);
