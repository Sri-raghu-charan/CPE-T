import { Queue, QueueOptions } from 'bullmq';
import { env } from '../config/env.js';

const defaultConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

export function createQueue<T = any>(name: string, options?: Partial<QueueOptions>): Queue<T> {
  return new Queue<T>(name, {
    connection: defaultConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
    ...options,
  });
}
