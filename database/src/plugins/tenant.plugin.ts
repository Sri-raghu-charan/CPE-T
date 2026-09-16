import { Schema } from 'mongoose';

export interface TenantFields {
  organizationId?: string;
}

export function tenantPlugin(schema: Schema): void {
  schema.add({
    organizationId: {
      type: String,
      index: true,
      default: null,
    },
  });
}
