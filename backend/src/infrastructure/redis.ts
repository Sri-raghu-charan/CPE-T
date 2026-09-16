import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface RedisHealth {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  latencyMs?: number;
}

class RedisManager {
  private static instance: RedisManager;
  private client: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) {
            return null; // Stop retrying after 3 attempts during initial connection
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('[Redis] Connection established');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.warn(`[Redis] Connection warning: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    }

    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      const client = this.getClient();
      if (client.status === 'wait') {
        await client.connect();
      }
    } catch (err: any) {
      logger.warn(`[Redis] Optional Redis daemon not reachable: ${err.message}. System continuing with fallback.`);
    }
  }

  public async checkHealth(): Promise<RedisHealth> {
    if (!this.client) {
      return { status: 'disconnected' };
    }

    if (this.client.status === 'ready' || this.client.status === 'connect') {
      const start = Date.now();
      try {
        await this.client.ping();
        return {
          status: 'connected',
          latencyMs: Date.now() - start,
        };
      } catch {
        return { status: 'error' };
      }
    }

    if (this.client.status === 'connecting' || this.client.status === 'reconnecting') {
      return { status: 'connecting' };
    }

    return { status: 'disconnected' };
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
      this.isConnected = false;
      logger.info('[Redis] Disconnected gracefully');
    }
  }
}

export const redisManager = RedisManager.getInstance();
