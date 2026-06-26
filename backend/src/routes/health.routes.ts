import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ok',
      service: 'backend',
      database: 'connected',
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    res.status(503).json({
      status: 'error',
      service: 'backend',
      database: 'disconnected',
    });
  }
});
