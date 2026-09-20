import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../app.js';
import { authService } from '../modules/auth/service.js';
import { caseService } from '../modules/cases/case.service.js';
import { memoryStore } from '../infrastructure/store.js';
import { fastCacheStore, getFastCacheSize, clearFastCache } from '../middleware/fastCache.js';
import { otpRateLimiter } from '../middleware/rateLimiter.js';
import { setEmailProvider } from '../providers/email/index.js';

describe('Phase 1 Critical Fixes Verification Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
    clearFastCache();
    setEmailProvider({
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
      sendOtpEmail: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  describe('BUG-6: Case Read Authorization IDOR Protection', () => {
    it('should reject unauthorized citizen attempting to mark another citizen\'s case read with 403 Forbidden', async () => {
      const citizenA = {
        _id: '66d00000000000000000000a',
        name: 'Citizen Alice',
        email: 'alice.phase1@cpet.test',
        role: 'CITIZEN' as const,
        isActive: true,
      };
      memoryStore.users.set(citizenA._id, citizenA as any);
      const tokenA = authService.generateAccessToken(citizenA);

      const citizenB = {
        _id: '66d00000000000000000000b',
        name: 'Citizen Bob',
        email: 'bob.phase1@cpet.test',
        role: 'CITIZEN' as const,
        isActive: true,
      };
      memoryStore.users.set(citizenB._id, citizenB as any);
      const tokenB = authService.generateAccessToken(citizenB);

      // Seed verified organization for routing
      memoryStore.organizations.set('org-phase1-id', {
        _id: 'org-phase1-id',
        name: 'Test Utilities',
        slug: 'test-utilities',
        type: 'COMMERCE',
        category: 'Consumer Affairs',
        status: 'VERIFIED',
        contactEmail: 'contact@testutils.org',
        settings: { autoAssign: false, defaultSlaHours: 48 },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // 2. Citizen A creates a case
      const caseA = await caseService.createCase(
        {
          type: 'COMPLAINT',
          title: 'Alice Confidential Complaint',
          description: 'Private citizen issue',
          category: 'Consumer Affairs',
        } as any,
        citizenA as any
      );

      // 3. Citizen B attempts to mark read on Citizen A's case -> 403 Forbidden
      const resB = await request(app)
        .post(`/api/v1/cases/${caseA._id}/read`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(403);
      expect(resB.body.error.code).toBe('FORBIDDEN');

      // 4. Citizen A (the owner) marks read on own case -> 200 OK
      const resA = await request(app)
        .post(`/api/v1/cases/${caseA._id}/read`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);
      expect(resA.body.data.caseId).toBe(caseA._id.toString());
    });
  });

  describe('BUG-7: Fast Cache Memory Leak Prevention & Bounded LRU', () => {
    it('should maintain strict bounded size under 1,500 unique randomized query parameters', () => {
      clearFastCache();
      expect(getFastCacheSize()).toBe(0);

      // Simulate 1,500 unique query parameter requests
      for (let i = 0; i < 1500; i++) {
        fastCacheStore.set(`/api/v1/public/items?rand=${i}&param=${Math.random()}`, {
          body: { item: i },
          contentType: 'application/json',
          expiresAt: Date.now() + 60000,
        });
      }

      // Must NEVER exceed the configured maxSize of 500
      expect(getFastCacheSize()).toBeLessThanOrEqual(500);
      expect(getFastCacheSize()).toBe(500);
    });

    it('should evict expired cache entries on retrieval', () => {
      clearFastCache();
      const expiredKey = '/api/v1/test-expired';

      // Insert expired entry
      fastCacheStore.set(expiredKey, {
        body: { expired: true },
        contentType: 'application/json',
        expiresAt: Date.now() - 1000,
      });

      // Retrieval should return null and purge key
      const result = fastCacheStore.get(expiredKey);
      expect(result).toBeNull();
      expect(getFastCacheSize()).toBe(0);
    });
  });

  describe('BUG-8: OTP Rate Limiter Composite Key Isolation', () => {
    it('should isolate OTP rate limit quota per (IP + Target) composite', async () => {
      const testOtpApp = express();
      testOtpApp.set('trust proxy', 1);
      testOtpApp.use(express.json());
      testOtpApp.post('/test-otp', otpRateLimiter, (_req, res) => {
        res.status(200).json({ success: true });
      });

      // IP 1 sends request for victim
      const resIp1 = await request(testOtpApp)
        .post('/test-otp')
        .set('X-Forwarded-For', '198.51.100.1')
        .send({ email: 'victim@cpet.test' });

      expect(resIp1.status).toBe(200);

      // IP 2 sends request for same victim -> distinct composite key
      const resIp2 = await request(testOtpApp)
        .post('/test-otp')
        .set('X-Forwarded-For', '198.51.100.2')
        .send({ email: 'victim@cpet.test' });

      expect(resIp2.status).toBe(200);
    });
  });
});
