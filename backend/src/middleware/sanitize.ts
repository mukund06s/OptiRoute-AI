import { NextFunction, Request, Response } from 'express';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

function sanitizeObject(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (UNSAFE_KEYS.has(key)) {
      continue;
    }
    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body = sanitizeObject(req.body as Record<string, unknown>);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as Record<string, unknown>) as Request['query'];
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params as Record<string, unknown>) as Request['params'];
  }

  next();
}
