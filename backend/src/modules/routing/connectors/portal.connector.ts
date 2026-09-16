import { IChannelConnector, DispatchPayload, DispatchResult } from './connector.interface.js';
import { logger } from '../../../utils/logger.js';

export class OfficialPortalConnector implements IChannelConnector {
  public readonly channelType = 'OFFICIAL_PORTAL';

  public supports(type: string): boolean {
    return type === 'OFFICIAL_PORTAL';
  }

  public async dispatch(payload: DispatchPayload): Promise<DispatchResult> {
    const portalAddress = payload.destination.value;
    logger.info(`[OfficialPortalConnector] Dispatching case ${payload.referenceNumber} to official portal: ${portalAddress}`);

    if (portalAddress.includes('fail-retry')) {
      logger.warn(`[OfficialPortalConnector] Simulated portal maintenance outage for: ${portalAddress}`);
      return {
        success: false,
        channel: 'OFFICIAL_PORTAL',
        error: `Portal gateway temporarily in maintenance mode for ${portalAddress}`,
        retryable: true,
      };
    }

    const tokenReceipt = `PORTAL-REC-${Date.now()}`;
    return {
      success: true,
      channel: 'OFFICIAL_PORTAL',
      externalReference: tokenReceipt,
      deliveredAt: new Date(),
      retryable: false,
      metadata: {
        portalUrl: portalAddress,
        trackingReceipt: tokenReceipt,
        department: payload.destination.department,
      },
    };
  }
}
