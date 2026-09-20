import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { dbManager } from '@cpet/database';
import { redisManager } from './infrastructure/redis.js';
import { socketManager } from './infrastructure/socket.js';
import { escalationQueueService } from './modules/escalation/escalation.queue.js';
import { dispatchQueueService } from './modules/routing/dispatch.queue.js';

let server: http.Server | null = null;

async function bootstrap() {
  logger.info(`[CPET Backend] Starting application in ${env.NODE_ENV} mode...`);

  // 1. Connect MongoDB
  try {
    await dbManager.connect({ uri: env.MONGODB_URI });
    logger.info('[CPET Backend] MongoDB connected');
  } catch (err: any) {
    logger.warn(`[CPET Backend] Initial MongoDB connection skipped/pending: ${err.message}`);
  }

  // 2. Connect Redis
  await redisManager.connect();

  // 3. Initialize BullMQ queues and workers
  await escalationQueueService.init();
  await dispatchQueueService.init();

  // 4. Initialize HTTP & WebSockets
  const app = createApp();
  const httpServer = http.createServer(app);
  socketManager.init(httpServer);

  // 5. Start HTTP server to accept requests
  server = httpServer.listen(env.PORT, env.HOST, () => {
    logger.info(`[CPET Backend] Server listening on ${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode (HTTP + WebSocket)`);
    logger.info('[CPET Backend] Server started');
  });
}

async function shutdown(signal: string) {
  logger.info(`[CPET Backend] Received ${signal}, initiating graceful shutdown`);

  if (server) {
    server.close(async () => {
      logger.info('[CPET Backend] HTTP server closed');
      try {
        await escalationQueueService.stop();
        await dispatchQueueService.stop();
        await dbManager.disconnect();
        await redisManager.disconnect();
      } catch (err) {
        logger.error('[CPET Backend] Error during graceful shutdown', { err });
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force shutdown after 10s if dangling connections remain
  setTimeout(() => {
    logger.error('[CPET Backend] Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch((err) => {
  logger.error('[CPET Backend] Fatal startup error', { err });
  process.exit(1);
});
