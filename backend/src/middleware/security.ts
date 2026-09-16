import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

export function setupHelmet(): RequestHandler {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

export function setupCors(): RequestHandler {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
    credentials: true,
    maxAge: 86400,
  });
}

/**
 * Recursively inspects data structures for NoSQL injection operators ($gt, $ne, $where, etc.)
 * or keys containing forbidden dot notations.
 */
export function hasNoSqlInjection(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (typeof obj[key] === 'object' && hasNoSqlInjection(obj[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Middleware preventing NoSQL Injection across query params, body, and params.
 */
export function nosqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (hasNoSqlInjection(req.query)) {
    logSecurityEvent('NOSQL_INJECTION_BLOCKED', { location: 'query', value: req.query }, req);
    return next(new ValidationError('Malformed query parameters: NoSQL operator injection detected'));
  }

  if (hasNoSqlInjection(req.params)) {
    logSecurityEvent('NOSQL_INJECTION_BLOCKED', { location: 'params', value: req.params }, req);
    return next(new ValidationError('Malformed route parameters: NoSQL operator injection detected'));
  }

  if (req.body && typeof req.body === 'object') {
    if (hasNoSqlInjection(req.body)) {
      logSecurityEvent('NOSQL_INJECTION_BLOCKED', { location: 'body', value: req.body }, req);
      return next(new ValidationError('Malformed request body: NoSQL operator injection detected'));
    }
  }

  next();
}

/**
 * Sanitizes potential XSS strings by neutralizing dangerous HTML tags.
 */
export function sanitizeXssString(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}

/**
 * Recursively sanitizes string inputs to prevent XSS payloads.
 */
export function xssSanitizer(req: Request, _res: Response, next: NextFunction): void {
  const sanitizeDeep = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeXssString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeDeep);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(obj)) {
        sanitized[key] = sanitizeDeep(val);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeDeep(req.query) as any;
  }

  next();
}

/**
 * In-memory / production tracker for brute-force protection.
 */
interface BruteForceEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

class BruteForceProtector {
  private records = new Map<string, BruteForceEntry>();
  private maxAttempts = 5;
  private windowMs = 15 * 60 * 1000; // 15 minutes
  private lockoutMs = 15 * 60 * 1000; // 15 minutes

  public isLocked(key: string): { locked: boolean; retryAfterSeconds?: number } {
    const entry = this.records.get(key);
    if (!entry) return { locked: false };

    const now = Date.now();
    if (entry.lockedUntil && entry.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { locked: true, retryAfterSeconds };
    }

    if (now - entry.firstAttemptAt > this.windowMs) {
      this.records.delete(key);
      return { locked: false };
    }

    return { locked: false };
  }

  public recordFailure(key: string): { locked: boolean; attempts: number } {
    const now = Date.now();
    let entry = this.records.get(key);

    if (!entry || now - entry.firstAttemptAt > this.windowMs) {
      entry = { attempts: 1, firstAttemptAt: now };
    } else {
      entry.attempts += 1;
    }

    if (entry.attempts >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutMs;
      this.records.set(key, entry);
      return { locked: true, attempts: entry.attempts };
    }

    this.records.set(key, entry);
    return { locked: false, attempts: entry.attempts };
  }

  public recordSuccess(key: string): void {
    this.records.delete(key);
  }

  public reset(): void {
    this.records.clear();
  }
}

export const bruteForceProtector = new BruteForceProtector();

/**
 * Security Event Logger for audit compliance.
 */
export function logSecurityEvent(
  eventType: string,
  details: Record<string, any>,
  req?: Request
): void {
  logger.warn(`[SecurityAudit] Event: ${eventType}`, {
    eventType,
    correlationId: req?.headers['x-correlation-id'] || req?.headers['x-request-id'],
    ip: req?.ip || req?.socket?.remoteAddress,
    path: req?.originalUrl || req?.path,
    method: req?.method,
    user: (req as any)?.user ? { userId: (req as any).user.userId, role: (req as any).user.role } : undefined,
    details,
    timestamp: new Date().toISOString(),
  });
}

