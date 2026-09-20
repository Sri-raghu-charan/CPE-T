import { Queue, Worker } from 'bullmq';
import { redisManager } from '../../infrastructure/redis.js';
import { escalationService } from './escalation.service.js';
import { logger } from '../../utils/logger.js';

import { env } from '../../config/env.js';

export class EscalationQueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Queues and workers are initialized via init() in the startup lifecycle
  }

  public async init(): Promise<void> {
    const redisClient = redisManager.getClient();

    if (redisClient && (redisClient.status === 'ready' || redisClient.status === 'connect')) {
      try {
        const connectionOptions = {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
        };

        this.queue = new Queue('cpet-escalation-queue', {
          connection: connectionOptions,
          defaultJobOptions: {
            attempts: 2,
            removeOnComplete: true,
          },
        });

        // Add repeatable job every 60 seconds
        await this.queue.add(
          'periodic-escalation-sweep',
          {},
          {
            repeat: {
              every: 60 * 1000,
            },
          }
        );
        logger.info('[BullMQ] Queue initialized: cpet-escalation-queue');

        this.worker = new Worker(
          'cpet-escalation-queue',
          async () => {
            const res = await escalationService.sweepAndEscalateBreachedCases();
            if (res.escalatedCount > 0) {
              logger.info(`[BullMQ Escalation Worker] Swept and escalated ${res.escalatedCount} breached cases.`);
            }
          },
          { connection: connectionOptions }
        );

        logger.info('[BullMQ] Worker initialized: cpet-escalation-queue');
      } catch (err: any) {
        logger.warn(`[BullMQ] Escalation queue setup failed: ${err.message}. Using resilient memory timer.`);
        this.startMemoryTimer();
      }
    } else {
      this.startMemoryTimer();
    }
  }

  private startMemoryTimer() {
    if (this.intervalTimer) return;
    // Periodic sweep every 60 seconds
    this.intervalTimer = setInterval(async () => {
      try {
        await escalationService.sweepAndEscalateBreachedCases();
      } catch (err: any) {
        logger.error(`[Memory Escalation Sweep] Error during sweep: ${err.message}`);
      }
    }, 60 * 1000);

    // Unref timer so it doesn't hold open test processes
    this.intervalTimer.unref();
  }

  /**
   * Triggers an immediate sweep (useful for testing and admin triggers).
   */
  public async runImmediateSweep(): Promise<{
    evaluatedCount: number;
    escalatedCount: number;
    escalatedCaseIds: string[];
  }> {
    return escalationService.sweepAndEscalateBreachedCases();
  }

  public async stop(): Promise<void> {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}

export const escalationQueueService = new EscalationQueueService();
