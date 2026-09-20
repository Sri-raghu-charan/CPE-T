import { IChannelConnector, DispatchPayload, DispatchResult } from './connector.interface.js';
import { logger } from '../../../utils/logger.js';
import { getEmailProvider } from '../../../providers/email/index.js';

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

    const subject = `[CPET-${payload.type}] ${payload.title} (${payload.referenceNumber})`;
    const text = [
      `A new case has been dispatched to your department via the CPET platform.`,
      ``,
      `Reference Number: ${payload.referenceNumber}`,
      `Type: ${payload.type}`,
      `Category: ${payload.category}`,
      `Title: ${payload.title}`,
      `Priority: ${payload.priority}`,
      `Department: ${payload.destination.department || 'General Intake'}`,
      ``,
      `Description:`,
      payload.description,
      ``,
      `Access the CPET portal to manage and resolve this case.`,
    ].join('\n');

    const html = `
      <h2>[CPET-${payload.type}] ${payload.title}</h2>
      <p><strong>Reference Number:</strong> ${payload.referenceNumber}</p>
      <p><strong>Category:</strong> ${payload.category}</p>
      <p><strong>Priority:</strong> ${payload.priority}</p>
      <p><strong>Department:</strong> ${payload.destination.department || 'General Intake'}</p>
      <hr/>
      <p><strong>Description:</strong></p>
      <p>${payload.description.replace(/\n/g, '<br/>')}</p>
    `;

    try {
      const emailProvider = getEmailProvider();
      const sendResult = await emailProvider.sendEmail({
        to: targetEmail,
        subject,
        text,
        html,
      });

      if (!sendResult.success) {
        return {
          success: false,
          channel: 'EMAIL',
          error: 'Email provider failed to deliver dispatch notification',
          retryable: true,
        };
      }

      const externalReference =
        sendResult.messageId && sendResult.messageId.includes('cpet-')
          ? sendResult.messageId
          : `cpet-${payload.referenceNumber}-${Date.now()}`;

      return {
        success: true,
        channel: 'EMAIL',
        externalReference,
        deliveredAt: new Date(),
        retryable: false,
        metadata: {
          to: targetEmail,
          subject,
          department: payload.destination.department,
        },
      };
    } catch (err: any) {
      logger.error(`[EmailConnector] Exception during email dispatch: ${err.message}`);
      return {
        success: false,
        channel: 'EMAIL',
        error: err.message || 'SMTP delivery failure',
        retryable: true,
      };
    }
  }
}
