import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { authService } from '../modules/auth/service.js';
import { memoryStore } from '../infrastructure/store.js';
import { clearFastCache } from '../middleware/fastCache.js';
import { setEmailProvider } from '../providers/email/index.js';

describe('Audit Repaired Modules Integration Suite', () => {
  const app = createApp();

  const citizenUser = {
    _id: '66d000000000000000000099',
    name: 'Dev Citizen',
    email: 'citizen@cpet.org',
    role: 'CITIZEN' as const,
    isActive: true,
  };

  const adminUser = {
    _id: '66d000000000000000000010',
    name: 'Super Admin',
    email: 'admin@cpet.org',
    role: 'SUPER_ADMIN' as const,
    isActive: true,
  };

  let citizenToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearFastCache();
    setEmailProvider({
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
      sendOtpEmail: vi.fn().mockResolvedValue({ success: true }),
    });

    memoryStore.users.set(citizenUser._id, citizenUser as any);
    memoryStore.users.set(adminUser._id, adminUser as any);
    citizenToken = authService.generateAccessToken(citizenUser);
    adminToken = authService.generateAccessToken(adminUser);
  });

  describe('Module: Dynamic Forms API (/api/v1/forms)', () => {
    it('GET /api/v1/forms should return published public forms', async () => {
      const res = await request(app)
        .get('/api/v1/forms?type=public')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('fields');
    });

    it('GET /api/v1/forms/:id should return single form definition by ID or slug', async () => {
      const formsRes = await request(app).get('/api/v1/forms');
      const formId = formsRes.body.data[0]._id;

      const singleRes = await request(app)
        .get(`/api/v1/forms/${formId}`)
        .expect(200);

      expect(singleRes.body.success).toBe(true);
      expect(singleRes.body.data._id).toBe(formId);
      expect(Array.isArray(singleRes.body.data.fields)).toBe(true);
    });

    it('POST /api/v1/forms/:id/submit should record submission and create tracked case', async () => {
      const formId = '66d000000000000000000031'; // Seeded water leakage form
      const submissionPayload = {
        answers: {
          location: 'Ward 4, Street 12, Main Bazar',
          leakageType: 'Distribution Pipe Leak',
          severity: 'Affecting entire street',
          description: 'Drinking water pipe has broken creating massive street water accumulation.',
        },
        citizenInfo: {
          name: 'Dev Citizen',
          email: 'citizen@cpet.org',
          phone: '+91 9876543210',
        },
      };

      const res = await request(app)
        .post(`/api/v1/forms/${formId}/submit`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(submissionPayload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('case');
      expect(res.body.data.case).toHaveProperty('referenceNumber');
      expect(res.body.data.case.referenceNumber).toMatch(/^CPET-2026-\d+$/);
    });
  });

  describe('Module: Notifications API (/api/v1/notifications)', () => {
    it('GET /api/v1/notifications should return notifications for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('isRead');
    });

    it('PATCH /api/v1/notifications/:id/read should mark notification as read', async () => {
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${citizenToken}`);

      const notifId = listRes.body.data[0].id;

      const patchRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(200);

      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.isRead).toBe(true);
    });

    it('POST /api/v1/notifications/test-sms should simulate SMS dispatch', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/test-sms')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ phone: '+919876543210', message: 'Test verification SMS' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SENT');
    });
  });

  describe('Module: Admin Metrics (/api/v1/cases/admin/metrics)', () => {
    it('GET /api/v1/cases/admin/metrics should return aggregated case metrics without route collision', async () => {
      const res = await request(app)
        .get('/api/v1/cases/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalCases');
      expect(res.body.data).toHaveProperty('openCases');
      expect(res.body.data).toHaveProperty('resolvedCases');
      expect(res.body.data).toHaveProperty('breachedCases');
      expect(res.body.data).toHaveProperty('casesByPriority');
    });
  });

  describe('Module: Blood Emergency Registry (/api/v1/blood)', () => {
    it('GET /api/v1/blood/donors should return active donors with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/blood/donors?bloodGroup=O-')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].bloodGroup).toBe('O-');
    });

    it('GET /api/v1/blood/inventory should return aggregated blood inventory units', async () => {
      const res = await request(app)
        .get('/api/v1/blood/inventory')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('inventory');
      expect(res.body.data[0].inventory).toHaveProperty('O+');
    });
  });

  describe('Module: Reference Number Case Lookup', () => {
    it('GET /api/v1/cases/:referenceNumber should resolve case details via referenceNumber', async () => {
      const seededCase = memoryStore.cases.get('66d100000000000000000001');
      expect(seededCase).toBeDefined();
      const refNumber = seededCase!.referenceNumber;

      const res = await request(app)
        .get(`/api/v1/cases/${refNumber}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceNumber).toBe(refNumber);
      expect(res.body.data.title).toBe(seededCase!.title);
    });
  });
});
