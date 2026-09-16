import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.correlationId || 'unknown';

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ') || 'Validation error';
    logger.warn(`Validation error: ${message}`, {
      correlationId,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: err.errors,
        correlationId,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      correlationId,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        correlationId,
      },
    });
    return;
  }

  // Programmer or unexpected internal error
  logger.error(`Unhandled error: ${err.message}`, {
    correlationId,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  const isProd = env.NODE_ENV === 'production';

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProd ? 'An internal server error occurred' : err.message,
      ...(isProd ? {} : { stack: err.stack }),
      correlationId,
    },
  });
}
