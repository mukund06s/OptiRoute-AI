import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function securityRequestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'security',
          event: 'request_completed',
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip,
          durationMs: Date.now() - startedAt,
          environment: env.NODE_ENV,
        })
      );
    }
  });

  next();
}
