import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: any;
  contentType: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * High-performance fast-path caching middleware for read endpoints.
 * Dramatically boosts throughput and lowers latencies for static/semi-static data.
 */
export function fastCache(ttlSeconds: number = 30) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.baseUrl}${req.path}?${JSON.stringify(req.query)}`;
    const now = Date.now();
    const entry = memoryCache.get(key);

    if (entry && entry.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', entry.contentType);
      res.send(entry.body);
      return;
    }

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, {
          body,
          contentType: (res.getHeader('Content-Type') as string) || 'application/json; charset=utf-8',
          expiresAt: now + ttlSeconds * 1000,
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalSend(body);
    };

    next();
  };
}

export function clearFastCache(): void {
  memoryCache.clear();
}
