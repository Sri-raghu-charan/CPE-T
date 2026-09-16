import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { UserModel, OrganizationModel } from '@cpet/database';
import { env } from '../config/env.js';

describe('Phase 2 — Multi-Tenancy & RBAC Isolation', () => {
  const app = createApp();

  const orgAId = '66d000000000000000000010';
  const orgBId = '66d000000000000000000020';

  const userOrgA = {
    _id: '66d000000000000000000011',
    name: 'Agent Org A',
    email: 'agent@orga.com',
    role: 'ORGANIZATION_ADMIN',
    organizationId: orgAId,
    isActive: true,
    isDeleted: false,
  };

  const citizenUser = {
    _id: '66d000000000000000000099',
    name: 'Citizen Jane',
    email: 'jane@citizen.org',
    role: 'CITIZEN',
    organizationId: null,
    isActive: true,
    isDeleted: false,
  };

  function createTestToken(user: typeof userOrgA | typeof citizenUser) {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Unauthenticated request to organization workspace should return 401 Unauthorized', async () => {
    const res = await request(app).get(`/api/v1/organizations/${orgAId}/dashboard`);
    expect(res.status).toBe(401);
  });

  it('Citizen user attempting to access organization workspace should return 403 Forbidden', async () => {
    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue(citizenUser),
    } as any);

    const token = createTestToken(citizenUser);

    const res = await request(app)
      .get(`/api/v1/organizations/${orgAId}/dashboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain("Insufficient privileges for role 'CITIZEN'");
  });

  it('Org A user accessing their own tenant dashboard should succeed (200 OK)', async () => {
    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue(userOrgA),
    } as any);
    vi.spyOn(OrganizationModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: orgAId,
        name: 'Metro Electric Utility',
        slug: 'metro-electric-utility',
        settings: { defaultSlaHours: 24 },
      }),
    } as any);

    const token = createTestToken(userOrgA);

    const res = await request(app)
      .get(`/api/v1/organizations/${orgAId}/dashboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenant.name).toBe('Metro Electric Utility');
    expect(res.body.data).toHaveProperty('totalRequests');
  });

  it('Tenant Violation: Org A user attempting to access Org B tenant space must return 403 Forbidden', async () => {
    vi.spyOn(UserModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue(userOrgA), // Belongs to Org A
    } as any);

    const token = createTestToken(userOrgA);

    // Attempts to access Org B's private dashboard
    const res = await request(app)
      .get(`/api/v1/organizations/${orgBId}/dashboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Tenant violation: Access to other organization data is strictly prohibited');
  });
});
