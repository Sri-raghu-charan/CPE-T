import { IChannelConnector, DispatchPayload, DispatchResult } from './connector.interface.js';
import { logger } from '../../../utils/logger.js';

export class ApiConnector implements IChannelConnector {
  public readonly channelType = 'API';

  public supports(type: string): boolean {
    return type === 'API' || type === 'WEBHOOK';
  }

  public async dispatch(payload: DispatchPayload): Promise<DispatchResult> {
    const targetUrl = payload.destination.value;
    logger.info(`[ApiConnector] Dispatching case ${payload.referenceNumber} to API endpoint: ${targetUrl}`);

    if (targetUrl.includes('fail-retry') || targetUrl.includes('timeout.error')) {
      logger.warn(`[ApiConnector] Simulated HTTP 503 Gateway Timeout for: ${targetUrl}`);
      return {
        success: false,
        channel: payload.destination.type,
        error: `HTTP 503 Service Unavailable from endpoint: ${targetUrl}`,
        retryable: true,
      };
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return {
        success: false,
        channel: payload.destination.type,
        error: `Invalid URL scheme for API connector: ${targetUrl}`,
        retryable: false,
      };
    }

    const ticketId = `API-TKT-${Date.now()}`;
    return {
      success: true,
      channel: payload.destination.type,
      externalReference: ticketId,
      deliveredAt: new Date(),
      retryable: false,
      metadata: {
        endpoint: targetUrl,
        idempotencyKey: payload.dispatchId,
        department: payload.destination.department,
      },
    };
  }
}
