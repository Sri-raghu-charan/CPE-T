import { describe, it, expect } from 'vitest';
import { DestinationModel } from './destination.model.js';
import { OtpModel } from './otp.model.js';

describe('Database Models Schema Indexing & Security Verification', () => {
  it('DestinationModel should have credentials hidden with select: false', () => {
    const credsPath = DestinationModel.schema.path('credentials') as any;
    expect(credsPath).toBeDefined();
    expect(credsPath.options.select).toBe(false);
  });

  it('DestinationModel should define compound indexes for query optimization', () => {
    const indexes = DestinationModel.schema.indexes();
    const indexFieldKeys = indexes.map((idx) => Object.keys(idx[0]).join(','));

    // Check organizationId, activeStatus, verificationStatus
    expect(indexFieldKeys).toContain('organizationId,activeStatus,verificationStatus');
    // Check type, activeStatus, verificationStatus
    expect(indexFieldKeys).toContain('type,activeStatus,verificationStatus');
  });

  it('OtpModel should define compound indexes for rapid query and validation lookup', () => {
    const indexes = OtpModel.schema.indexes();
    const indexFieldKeys = indexes.map((idx) => Object.keys(idx[0]).join(','));

    // Check target, purpose, isVerified, createdAt
    expect(indexFieldKeys).toContain('target,purpose,isVerified,createdAt');
    // Check target, createdAt
    expect(indexFieldKeys).toContain('target,createdAt');
  });
});
