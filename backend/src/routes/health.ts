import { Router, Request, Response } from 'express';
import { dbManager } from '@cpet/database';
import { redisManager } from '../infrastructure/redis.js';

export const healthRouter = Router();

/**
 * Root health endpoint: responds 200 if process is alive.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness probe: responds 200 if process is alive.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: checks underlying dependencies.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const [dbHealth, redisHealth] = await Promise.all([
    dbManager.checkHealth(),
    redisManager.checkHealth(),
  ]);

  const isHealthy = dbHealth.status === 'connected';

  // Return 200 if connected or in dev mode without external DB
  const statusCode = isHealthy || process.env.NODE_ENV === 'test' ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      redis: redisHealth,
    },
  });
});
