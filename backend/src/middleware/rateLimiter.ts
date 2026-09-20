import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { RateLimitError } from '../utils/errors.js';
import { logSecurityEvent } from './security.js';

/**
 * Standard factory for configurable rate limiters.
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  name: string;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: options.keyGenerator,
    skip: (req) => {
      if (process.env.CPET_LOAD_TEST === 'true') return true;
      return options.skip ? options.skip(req) : false;
    },
    handler: (req, _res, next) => {
      logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        {
          limiter: options.name,
          max: options.max,
          windowMs: options.windowMs,
        },
        req
      );
      next(new RateLimitError(`Too many requests to ${options.name}. Please try again later.`));
    },
  });
}

// 1. Global Baseline Limiter
export const globalRateLimiter = createRateLimiter({
  name: 'global',
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  skip: (req) => req.path.startsWith('/health'),
});

// 2. Authentication Rate Limiter (Brute-force protection on Sign-in/Sign-up)
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 100 : 15, // 15 requests per 15 min per IP
});

// 3. OTP Dispatch Rate Limiter (SMS/Email abuse prevention)
// Uses composite key (IP + target) to prevent attackers on different IPs from causing DoS for victims
export const otpRateLimiter = createRateLimiter({
  name: 'otp',
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: env.NODE_ENV === 'test' ? 50 : 5, // 5 requests per 5 min
  keyGenerator: (req) => {
    const target = (req.body?.email || req.body?.phone || 'unknown').toLowerCase().trim();
    return `otp:${req.ip}:${target}`;
  },
});

// 4. AI Conversational Intake Rate Limiter
export const aiRateLimiter = createRateLimiter({
  name: 'ai-intake',
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test' ? 120 : 30, // 30 requests per minute
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// 5. Case Creation & Status Transition Rate Limiter
export const caseMutationRateLimiter = createRateLimiter({
  name: 'case-mutation',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 200 : 50, // 50 creations per 15 min
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// 6. Real-Time Case Messaging Rate Limiter
export const messageRateLimiter = createRateLimiter({
  name: 'messaging',
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test' ? 300 : 80, // 80 messages per minute
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// 7. Public Directory & Discovery Search Limiter
export const publicSearchRateLimiter = createRateLimiter({
  name: 'public-search',
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test' ? 500 : 180, // 180 requests per minute
});

// 8. Secure File Upload Rate Limiter
export const fileUploadRateLimiter = createRateLimiter({
  name: 'file-upload',
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: env.NODE_ENV === 'test' ? 50 : 15, // 15 uploads per 10 min
  keyGenerator: (req) => req.user?.userId || req.ip,
});

