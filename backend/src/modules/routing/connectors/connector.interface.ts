export interface DispatchPayload {
  dispatchId: string;
  caseId: string;
  referenceNumber: string;
  type: string;
  title: string;
  description: string;
  productService?: string;
  category?: string;
  priority: string;
  structuredData?: Record<string, any>;
  location?: {
    city?: string;
    address?: string;
    pincode?: string;
  };
  destination: {
    type: string;
    value: string;
    department?: string;
    credentials?: Record<string, any>;
  };
  requester: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  timestamp: Date;
}

export interface DispatchResult {
  success: boolean;
  channel: string;
  externalReference?: string;
  deliveredAt?: Date;
  error?: string;
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface IChannelConnector {
  readonly channelType: string;
  supports(type: string): boolean;
  dispatch(payload: DispatchPayload): Promise<DispatchResult>;
}
