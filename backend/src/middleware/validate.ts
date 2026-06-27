import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { securityLog } from '../lib/securityLogger';

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        securityLog('validation_failed', {
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
          issueCount: error.errors.length,
        });
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
