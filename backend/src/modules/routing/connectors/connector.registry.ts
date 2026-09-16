import { IChannelConnector } from './connector.interface.js';
import { InternalQueueConnector } from './internal-queue.connector.js';
import { EmailConnector } from './email.connector.js';
import { ApiConnector } from './api.connector.js';
import { OfficialPortalConnector } from './portal.connector.js';

export class ConnectorRegistry {
  private connectors: IChannelConnector[] = [];

  constructor() {
    this.register(new InternalQueueConnector());
    this.register(new EmailConnector());
    this.register(new ApiConnector());
    this.register(new OfficialPortalConnector());
  }

  public register(connector: IChannelConnector): void {
    this.connectors.push(connector);
  }

  public getConnector(type: string): IChannelConnector | null {
    return this.connectors.find((c) => c.supports(type)) || null;
  }
}

export const connectorRegistry = new ConnectorRegistry();
