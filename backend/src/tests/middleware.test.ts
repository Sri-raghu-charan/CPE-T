import { describe, it, expect } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { correlationIdMiddleware } from '../middleware/correlationId.js';

describe('Backend Middleware', () => {
  it('correlationIdMiddleware should preserve existing x-request-id or generate new one', async () => {
    const app = express();
    app.use(correlationIdMiddleware);
    app.get('/test-id', (req: Request, res: Response) => {
      res.json({ id: req.correlationId });
    });

    const resWithCustom = await request(app)
      .get('/test-id')
      .set('x-request-id', 'custom-trace-123');
    expect(resWithCustom.headers['x-request-id']).toBe('custom-trace-123');
    expect(resWithCustom.body.id).toBe('custom-trace-123');

    const resAuto = await request(app).get('/test-id');
    expect(resAuto.headers['x-request-id']).toBeDefined();
    expect(resAuto.headers['x-request-id']).not.toBe('custom-trace-123');
  });

  it('validate middleware should reject invalid input with 400 and structured details', async () => {
    const app = express();
    app.use(express.json());
    app.use(correlationIdMiddleware);

    const schema = {
      body: z.object({
        email: z.string().email(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    };

    app.post('/test-val', validate(schema), (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });
    app.use(errorHandler);

    const invalidRes = await request(app)
      .post('/test-val')
      .send({ email: 'not-an-email', priority: 'urgent' });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(invalidRes.body.error.details)).toBe(true);
  });
});
