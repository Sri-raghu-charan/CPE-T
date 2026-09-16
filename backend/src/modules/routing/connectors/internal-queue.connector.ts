import { IChannelConnector, DispatchPayload, DispatchResult } from './connector.interface.js';
import { logger } from '../../../utils/logger.js';

export class InternalQueueConnector implements IChannelConnector {
  public readonly channelType = 'INTERNAL_QUEUE';

  public supports(type: string): boolean {
    return type === 'INTERNAL_QUEUE';
  }

  public async dispatch(payload: DispatchPayload): Promise<DispatchResult> {
    logger.info(`[InternalQueueConnector] Dispatching case ${payload.referenceNumber} to internal queue: ${payload.destination.value}`);

    // Internal queue delivers directly into CPET organization triage inbox
    const externalReference = `INT-${payload.referenceNumber}`;
    return {
      success: true,
      channel: 'INTERNAL_QUEUE',
      externalReference,
      deliveredAt: new Date(),
      retryable: false,
      metadata: {
        queueName: payload.destination.value,
        department: payload.destination.department,
      },
    };
  }
}
