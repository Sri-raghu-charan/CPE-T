import { IChannelConnector, DispatchPayload, DispatchResult } from './connector.interface.js';
import { logger } from '../../../utils/logger.js';

export class EmailConnector implements IChannelConnector {
  public readonly channelType = 'EMAIL';

  public supports(type: string): boolean {
    return type === 'EMAIL';
  }

  public async dispatch(payload: DispatchPayload): Promise<DispatchResult> {
    const targetEmail = payload.destination.value;
    logger.info(`[EmailConnector] Dispatching case ${payload.referenceNumber} via Email to: ${targetEmail}`);

    // Simulation of failure condition for testing resilience & retry
    if (targetEmail.includes('fail-retry') || targetEmail === 'invalid-unreachable') {
      logger.warn(`[EmailConnector] Simulated transient failure for destination: ${targetEmail}`);
      return {
        success: false,
        channel: 'EMAIL',
        error: `SMTP connection timeout to mail server for ${targetEmail}`,
        retryable: true,
      };
    }

    if (!targetEmail.includes('@')) {
      return {
        success: false,
        channel: 'EMAIL',
        error: `Invalid email address format: ${targetEmail}`,
        retryable: false,
      };
    }

    // In production, nodemailer or AWS SES sends the email
    const messageId = `<cpet-${payload.referenceNumber}-${Date.now()}@cpet.org>`;
    return {
      success: true,
      channel: 'EMAIL',
      externalReference: messageId,
      deliveredAt: new Date(),
      retryable: false,
      metadata: {
        to: targetEmail,
        subject: `[CPET-${payload.type}] ${payload.title} (${payload.referenceNumber})`,
        department: payload.destination.department,
      },
    };
  }
}
