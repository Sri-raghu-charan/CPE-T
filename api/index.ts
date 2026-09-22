import type { IncomingMessage, ServerResponse } from 'http';
import type { Express } from 'express';
import { createApp } from '@cpet/backend/app';
import { dbManager } from '@cpet/database';
import { env } from '@cpet/backend/config';

let appInstance: Express | null = null;
let isConnected = false;

/**
 * Initializes and caches the Express app and ensures database connectivity
 * for Vercel Serverless Function invocations.
 */
async function getApp(): Promise<Express> {
  if (!appInstance) {
    appInstance = createApp();
  }

  if (!isConnected && env.MONGODB_URI) {
    try {
      await dbManager.connect({
        uri: env.MONGODB_URI,
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      isConnected = true;
    } catch (err: any) {
      console.error('[Vercel Serverless] MongoDB connection error:', err?.message || err);
      // Do not crash process; allow request to proceed so health routes / error handler can respond
    }
  }

  return appInstance!;
}

/**
 * Vercel Serverless Function entry handler.
 * Handles incoming HTTP requests and routes them through the Express application.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  return app(req as any, res as any);
}
