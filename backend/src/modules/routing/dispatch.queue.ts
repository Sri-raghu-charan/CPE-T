import { Queue, Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { redisManager } from '../../infrastructure/redis.js';
import { memoryStore } from '../../infrastructure/store.js';
import { CaseModel, CaseEventModel } from '@cpet/database';
import { DispatchPayload, DispatchResult } from './connectors/connector.interface.js';
import { connectorRegistry } from './connectors/connector.registry.js';
import { socketManager } from '../../infrastructure/socket.js';
import { logger } from '../../utils/logger.js';

export class DispatchQueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private processedDispatchIds = new Set<string>();

  constructor() {
    this.initQueue();
  }

  private initQueue() {
    const redisClient = redisManager.getClient();
    // Only configure BullMQ if Redis is active
    if (redisClient && redisClient.status === 'ready') {
      try {
        this.queue = new Queue('cpet-outbound-dispatch', {
          connection: redisClient,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: true,
          },
        });

        this.worker = new Worker(
          'cpet-outbound-dispatch',
          async (job: Job<DispatchPayload>) => {
            return this.processDispatchJob(job.data);
          },
          { connection: redisClient }
        );

        this.worker.on('failed', (job, err) => {
          logger.error(`[BullMQ] Dispatch job failed permanently: ${job?.id}`, { err });
        });

        logger.info('[BullMQ] Outbound dispatch queue & worker initialized with Redis');
      } catch (err: any) {
        logger.warn(`[BullMQ] Redis queue initialization failed: ${err.message}. Using resilient memory worker.`);
      }
    }
  }

  /**
   * Enqueues an asynchronous dispatch job for external or internal delivery.
   */
  public async enqueueDispatch(payload: DispatchPayload): Promise<{ enqueued: boolean; dispatchId: string }> {
    // Idempotency check: if this dispatchId was already processed, ignore
    if (this.processedDispatchIds.has(payload.dispatchId)) {
      logger.warn(`[DispatchQueue] Duplicate dispatchId detected: ${payload.dispatchId}. Skipping duplicate.`);
      return { enqueued: false, dispatchId: payload.dispatchId };
    }

    if (this.queue && redisManager.getClient().status === 'ready') {
      await this.queue.add('dispatch-case', payload, {
        jobId: payload.dispatchId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      });
      logger.info(`[DispatchQueue] Job ${payload.dispatchId} added to BullMQ for ${payload.referenceNumber}`);
    } else {
      // In-Memory Asynchronous Worker execution (for tests and offline mode)
      setImmediate(async () => {
        await this.processWithRetries(payload, 3);
      });
    }

    return { enqueued: true, dispatchId: payload.dispatchId };
  }

  /**
   * Retries an operation up to maxRetries before declaring permanent failure.
   */
  private async processWithRetries(payload: DispatchPayload, maxAttempts = 3): Promise<DispatchResult> {
    let lastResult: DispatchResult = {
      success: false,
      channel: payload.destination.type,
      retryable: false,
      error: 'Unprocessed',
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastResult = await this.processDispatchJob(payload, attempt);
      if (lastResult.success) {
        return lastResult;
      }
      if (!lastResult.retryable) {
        break; // Permanent failure (e.g. invalid email format)
      }
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms...
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    return lastResult;
  }

  /**
   * Dispatches payload through appropriate connector and records results.
   */
  public async processDispatchJob(payload: DispatchPayload, attemptNumber = 1): Promise<DispatchResult> {
    // Check idempotency
    if (this.processedDispatchIds.has(payload.dispatchId)) {
      return {
        success: true,
        channel: payload.destination.type,
        retryable: false,
        metadata: { duplicateSkipped: true },
      };
    }

    const connector = connectorRegistry.getConnector(payload.destination.type);
    if (!connector) {
      const errorMsg = `No connector registered for destination type: ${payload.destination.type}`;
      logger.error(`[DispatchQueue] ${errorMsg}`);
      await this.recordDispatchFailure(payload, errorMsg, attemptNumber);
      return {
        success: false,
        channel: payload.destination.type,
        error: errorMsg,
        retryable: false,
      };
    }

    try {
      const result = await connector.dispatch(payload);

      if (result.success) {
        this.processedDispatchIds.add(payload.dispatchId);
        await this.recordDispatchSuccess(payload, result);
        return result;
      } else {
        await this.recordDispatchFailure(payload, result.error || 'Unknown dispatch failure', attemptNumber);
        return result;
      }
    } catch (err: any) {
      logger.error(`[DispatchQueue] Exception during connector dispatch: ${err.message}`);
      await this.recordDispatchFailure(payload, err.message, attemptNumber);
      return {
        success: false,
        channel: payload.destination.type,
        error: err.message,
        retryable: true,
      };
    }
  }

  private async recordDispatchSuccess(payload: DispatchPayload, result: DispatchResult): Promise<void> {
    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      await CaseModel.findByIdAndUpdate(payload.caseId, {
        $set: {
          'externalDispatch.status': 'SENT',
          'externalDispatch.externalReference': result.externalReference,
          'externalDispatch.lastAttemptAt': new Date(),
          'externalDispatch.attempts': 1,
        },
      });

      await CaseEventModel.create({
        caseId: new Types.ObjectId(payload.caseId),
        actorId: null,
        actorName: 'CPET Channel Dispatcher',
        actorRole: 'SYSTEM',
        eventType: 'EXTERNAL_DISPATCH_SUCCESS',
        message: `Successfully dispatched to ${result.channel} (${payload.destination.value}). External Ref: ${result.externalReference || 'N/A'}`,
        isInternal: true,
        metadata: result.metadata || {},
        timestamp: new Date(),
      });
    } else {
      const memCase = memoryStore.cases.get(payload.caseId);
      if (memCase) {
        memCase.externalDispatch = {
          dispatchId: payload.dispatchId,
          channel: result.channel,
          status: 'SENT',
          externalReference: result.externalReference,
          lastAttemptAt: new Date(),
          attempts: 1,
        };
        memoryStore.cases.set(payload.caseId, memCase);
      }

      const existingEvents = memoryStore.caseEvents.get(payload.caseId) || [];
      existingEvents.push({
        _id: 'evt-disp-' + Date.now(),
        caseId: payload.caseId,
        actorId: null,
        actorName: 'CPET Channel Dispatcher',
        actorRole: 'SYSTEM',
        eventType: 'EXTERNAL_DISPATCH_SUCCESS',
        message: `Successfully dispatched to ${result.channel} (${payload.destination.value}). External Ref: ${result.externalReference || 'N/A'}`,
        isInternal: true,
        metadata: result.metadata || {},
        timestamp: new Date(),
      });
      memoryStore.caseEvents.set(payload.caseId, existingEvents);
    }

    // Broadcast real-time update
    socketManager.emitToCase(payload.caseId, 'case:dispatch_status', {
      caseId: payload.caseId,
      status: 'SENT',
      channel: result.channel,
      externalReference: result.externalReference,
    });
  }

  private async recordDispatchFailure(payload: DispatchPayload, error: string, attempts: number): Promise<void> {
    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      await CaseModel.findByIdAndUpdate(payload.caseId, {
        $set: {
          'externalDispatch.status': 'FAILED',
          'externalDispatch.lastAttemptAt': new Date(),
          'externalDispatch.attempts': attempts,
          'externalDispatch.error': error,
        },
      });

      await CaseEventModel.create({
        caseId: new Types.ObjectId(payload.caseId),
        actorId: null,
        actorName: 'CPET Channel Dispatcher',
        actorRole: 'SYSTEM',
        eventType: 'EXTERNAL_DISPATCH_FAILED',
        message: `Dispatch to ${payload.destination.type} (${payload.destination.value}) failed: ${error}`,
        isInternal: true,
        metadata: { error, attempts },
        timestamp: new Date(),
      });
    } else {
      const memCase = memoryStore.cases.get(payload.caseId);
      if (memCase) {
        memCase.externalDispatch = {
          dispatchId: payload.dispatchId,
          channel: payload.destination.type,
          status: 'FAILED',
          lastAttemptAt: new Date(),
          attempts,
          error,
        };
        memoryStore.cases.set(payload.caseId, memCase);
      }

      const existingEvents = memoryStore.caseEvents.get(payload.caseId) || [];
      existingEvents.push({
        _id: 'evt-disp-fail-' + Date.now(),
        caseId: payload.caseId,
        actorId: null,
        actorName: 'CPET Channel Dispatcher',
        actorRole: 'SYSTEM',
        eventType: 'EXTERNAL_DISPATCH_FAILED',
        message: `Dispatch to ${payload.destination.type} (${payload.destination.value}) failed: ${error}`,
        isInternal: true,
        metadata: { error, attempts },
        timestamp: new Date(),
      });
      memoryStore.caseEvents.set(payload.caseId, existingEvents);
    }

    socketManager.emitToCase(payload.caseId, 'case:dispatch_status', {
      caseId: payload.caseId,
      status: 'FAILED',
      channel: payload.destination.type,
      error,
    });
  }
}

export const dispatchQueueService = new DispatchQueueService();
