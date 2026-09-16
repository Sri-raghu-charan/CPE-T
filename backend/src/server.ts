import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { dbManager } from '@cpet/database';
import { redisManager } from './infrastructure/redis.js';
import { socketManager } from './infrastructure/socket.js';

const app = createApp();
const httpServer = http.createServer(app);

// Initialize Socket.IO real-time server
socketManager.init(httpServer);

const server = httpServer.listen(env.PORT, env.HOST, async () => {
  logger.info(`[CPET Backend] Server listening on ${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode (HTTP + WebSocket)`);

  // Attempt database connection (does not crash server if DB is temporarily unreachable during startup)
  try {
    await dbManager.connect({ uri: env.MONGODB_URI });
  } catch (err: any) {
    logger.warn(`[CPET Backend] Initial MongoDB connection skipped/pending: ${err.message}`);
  }

  // Attempt Redis connection
  await redisManager.connect();
});

async function shutdown(signal: string) {
  logger.info(`[CPET Backend] Received ${signal}, initiating graceful shutdown`);

  server.close(async () => {
    logger.info('[CPET Backend] HTTP server closed');
    try {
      await dbManager.disconnect();
      await redisManager.disconnect();
    } catch (err) {
      logger.error('[CPET Backend] Error during graceful shutdown', { err });
    }
    process.exit(0);
  });

  // Force shutdown after 10s if dangling connections remain
  setTimeout(() => {
    logger.error('[CPET Backend] Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
