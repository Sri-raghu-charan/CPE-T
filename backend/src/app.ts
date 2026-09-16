import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { setupHelmet, setupCors, nosqlSanitizer, xssSanitizer } from './middleware/security.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { apiV1Router } from './routes/api.v1.js';
import { NotFoundError } from './utils/errors.js';
import { env } from './config/env.js';

export function createApp(): Express {
  const app = express();

  // Basic security and tracing
  app.use(setupHelmet());
  app.use(setupCors());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(correlationIdMiddleware);

  // Body parsers with payload size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Input Sanitization & Injection Guards
  app.use(nosqlSanitizer);
  app.use(xssSanitizer);

  // Global rate limiter
  app.use(globalRateLimiter);

  // Health checks
  app.use('/health', healthRouter);

  // Versioned API
  app.use('/api/v1', apiV1Router);

  // 404 handler
  app.use((_req, _res, next) => {
    next(new NotFoundError('Requested route does not exist'));
  });

  // Centralized Error handling
  app.use(errorHandler);

  return app;
}
