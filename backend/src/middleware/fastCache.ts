import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: any;
  contentType: string;
  expiresAt: number;
}

export class BoundedLruCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  public get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  public set(key: string, entry: CacheEntry): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first inserted in Map order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
  }

  public size(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const fastCacheStore = new BoundedLruCache(500);

/**
 * Normalizes query parameters into a deterministic, sorted query string.
 */
function normalizeQuery(query: Record<string, any>): string {
  const keys = Object.keys(query).sort();
  if (keys.length === 0) return '';
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(query[k]))}`);
  }
  return parts.join('&');
}

/**
 * High-performance fast-path caching middleware for read endpoints with bounded LRU memory safety.
 */
export function fastCache(ttlSeconds: number = 30) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      return next();
    }

    // Protect against unbounded URL/query attacks: bypass caching if query is excessively large
    const queryString = normalizeQuery(req.query as Record<string, any>);
    if (queryString.length > 512) {
      return next();
    }

    const key = `${req.baseUrl}${req.path}${queryString ? '?' + queryString : ''}`;
    const now = Date.now();
    const entry = fastCacheStore.get(key);

    if (entry && entry.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', entry.contentType);
      res.send(entry.body);
      return;
    }

    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        fastCacheStore.set(key, {
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
  fastCacheStore.clear();
}

export function getFastCacheSize(): number {
  return fastCacheStore.size();
}
