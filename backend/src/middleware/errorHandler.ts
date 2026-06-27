import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { securityLog } from '../lib/securityLogger';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isProduction = env.NODE_ENV === 'production';

  if (err.type === 'entity.too.large') {
    securityLog('invalid_request', {
      path: req.originalUrl,
      method: req.method,
      reason: 'payload_too_large',
    });
    res.status(413).json({ error: 'Request entity too large' });
    return;
  }

  if (err.type === 'entity.parse.failed') {
    securityLog('invalid_request', {
      path: req.originalUrl,
      method: req.method,
      reason: 'invalid_json',
    });
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const statusCode = err.status ?? err.statusCode ?? 500;

  if (statusCode >= 500) {
    securityLog('internal_server_error', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });

    if (isProduction) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  if (isProduction) {
    res.status(statusCode).json({ error: err.message || 'Request failed' });
    return;
  }

  res.status(statusCode).json({
    error: err.message || 'Request failed',
    stack: err.stack,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  securityLog('not_found', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  res.status(404).json({ error: 'Not found' });
}
