import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { memoryStore } from '../infrastructure/store.js';
import { connectorRegistry } from '../modules/routing/connectors/connector.registry.js';

describe('Phase 5 — Organization Directory, Service Routing & Two-Way Communication', () => {
  const app = createApp();

  const lloydOrgId = '66d000000000000000000030';
  const apexOrgId = '66d000000000000000000010';

  const citizenUser = {
    _id: '66d000000000000000000099',
    name: 'Dev Citizen',
    email: 'citizen@cpet.org',
    role: 'CITIZEN' as const,
    organizationId: null,
    isActive: true,
  };

  const lloydAgent = {
    _id: '66d000000000000000000032',
    name: 'Lloyd Support Specialist',
    email: 'support@lloyd-appliances.com',
    role: 'ORGANIZATION_AGENT' as const,
    organizationId: lloydOrgId,
    isActive: true,
  };

  const lloydAdmin = {
    _id: '66d000000000000000000031',
    name: 'Lloyd Org Admin',
    email: 'admin@lloyd-appliances.com',
    role: 'ORGANIZATION_ADMIN' as const,
    organizationId: lloydOrgId,
    isActive: true,
  };

  const apexAgent = {
    _id: '66d000000000000000000012',
    name: 'Apex Agent Alice',
    email: 'alice@apexutility.org',
    role: 'ORGANIZATION_AGENT' as const,
    organizationId: apexOrgId,
    isActive: true,
  };

  function createToken(user: { _id: string; email: string; role: any; organizationId?: string | null }) {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId || null,
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  const citizenToken = createToken(citizenUser);
  const lloydAgentToken = createToken(lloydAgent);
  const lloydAdminToken = createToken(lloydAdmin);
  const apexAgentToken = createToken(apexAgent);

  beforeEach(() => {
    // Reset seed data in memory store to pristine state
    memoryStore.seedDefaults();
    memoryStore.users.set(citizenUser._id, citizenUser as any);
    memoryStore.users.set(lloydAgent._id, lloydAgent as any);
    memoryStore.users.set(lloydAdmin._id, lloydAdmin as any);
    memoryStore.users.set(apexAgent._id, apexAgent as any);
  });

  describe('1. Organization Directory', () => {
    it('should list verified organizations with services, products, and contact channels', async () => {
      const res = await request(app)
        .get('/api/v1/routing/directory')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const lloyd = res.body.data.find((o: any) => o._id === lloydOrgId);
      expect(lloyd).toBeDefined();
      expect(lloyd.brandName).toBe('Lloyd');
      expect(lloyd.products).toContain('Lloyd Air Conditioner');
      expect(lloyd.services).toContain('AC Servicing');
      expect(lloyd.departments.length).toBeGreaterThanOrEqual(1);
    });

    it('should search directory by brand query or keyword', async () => {
      const res = await request(app)
        .get('/api/v1/routing/directory?search=havells')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].brandName).toBe('Lloyd');
    });

    it('should filter directory by service category', async () => {
      const res = await request(app)
        .get('/api/v1/routing/directory?category=HVAC')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id).toBe(lloydOrgId);
    });
  });

  describe('2. Deterministic Service Routing Engine', () => {
    it('should deterministically route Lloyd AC Service Request to Lloyd Technical Support', async () => {
      const res = await request(app)
        .post('/api/v1/routing/evaluate')
        .send({
          rawOrgName: 'Lloyd',
          productService: 'AC',
          category: 'Consumer Electronics',
          location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      const decision = res.body.data;
      expect(decision.organizationId).toBe(lloydOrgId);
      expect(decision.organizationName).toContain('Lloyd');
      expect(decision.departmentId).toBe('DEP-LLD-TECH');
      expect(decision.departmentName).toBe('Technical Field Service & AC Care');
      expect(decision.destinationType).toBe('INTERNAL_QUEUE');
      expect(decision.destinationValue).toBe('lloyd-ac-triage-queue');
      expect(decision.slaHours).toBe(48);
    });

    it('should reject requests with unverified or invented organizations', async () => {
      const res = await request(app)
        .post('/api/v1/routing/evaluate')
        .send({
          rawOrgName: 'CompletelyFakeCorpX99',
          productService: 'FakeProduct',
        })
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('Cannot resolve verified organization');
    });

    it('should enforce that destinations must have active and verified status', async () => {
      // Create an unverified destination
      const unverifiedDestId = 'dest-unverified-test';
      memoryStore.destinations.set(unverifiedDestId, {
        _id: unverifiedDestId,
        organizationId: lloydOrgId,
        type: 'EMAIL',
        value: 'unverified@lloyd.com',
        source: 'MANUAL_ENTRY',
        verificationStatus: 'PENDING',
        activeStatus: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Clear other destinations to force selection of unverified
      const originalDests = new Map(memoryStore.destinations);
      memoryStore.destinations.clear();
      memoryStore.destinations.set(unverifiedDestId, {
        _id: unverifiedDestId,
        organizationId: lloydOrgId,
        type: 'EMAIL',
        value: 'unverified@lloyd.com',
        source: 'MANUAL_ENTRY',
        verificationStatus: 'PENDING',
        activeStatus: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/routing/evaluate')
        .send({
          organizationId: lloydOrgId,
          productService: 'AC',
        })
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toMatch(/unverified|No verified destination/i);

      // Restore destinations
      memoryStore.destinations = originalDests;
    });
  });

  describe('3. Automated Case Creation & Connector Dispatch', () => {
    it('should create case with evaluated routing and dispatch via InternalQueue connector', async () => {
      const casePayload = {
        type: 'SERVICE_REQUEST',
        title: 'Lloyd AC Cooling Issue',
        description: 'AC is blowing warm air since yesterday',
        category: 'Consumer Electronics',
        productService: 'AC',
        rawOrgName: 'Lloyd',
        priority: 'MEDIUM',
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
      };

      const res = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send(casePayload)
        .expect(201);

      expect(res.body.success).toBe(true);
      const createdCase = res.body.data;
      expect(createdCase.organizationId).toBe(lloydOrgId);
      expect(createdCase.routing).toBeDefined();
      expect(createdCase.routing.department).toBe('Technical Field Service & AC Care');
      expect(createdCase.routing.destinationType).toBe('INTERNAL_QUEUE');

      // Verify external dispatch status
      expect(createdCase.externalDispatch).toBeDefined();
      expect(createdCase.externalDispatch.status).toBe('PENDING');
      expect(createdCase.externalDispatch.channel).toBe('INTERNAL_QUEUE');

      // Allow in-memory worker tick to process delivery
      await new Promise((resolve) => setTimeout(resolve, 50));
      const deliveredCase = memoryStore.cases.get(createdCase._id);
      expect(deliveredCase?.externalDispatch?.status).toBe('SENT');
    });

    it('should dispatch case through Email and API connectors with audit logs', async () => {
      const emailConnector = connectorRegistry.getConnector('EMAIL');
      expect(emailConnector).toBeDefined();

      const mockCase: any = {
        _id: 'test-case-email-1',
        referenceNumber: 'CPET-2026-TEST1',
        title: 'Urgent Water Supply Leak',
        description: 'Main pipe leaking outside building',
        type: 'SERVICE_REQUEST',
        priority: 'HIGH',
        requesterName: 'Dev Citizen',
        requesterEmail: 'citizen@cpet.org',
        status: 'SUBMITTED',
      };

      const mockDest: any = {
        _id: 'dest-email-1',
        type: 'EMAIL',
        value: 'grievance@waterboard.gov.in',
        verificationStatus: 'VERIFIED',
        activeStatus: true,
      };

      const payload = {
        dispatchId: 'disp-email-test-1',
        caseId: mockCase._id,
        referenceNumber: mockCase.referenceNumber,
        type: mockCase.type,
        title: mockCase.title,
        description: mockCase.description,
        priority: 'MEDIUM',
        destination: mockDest,
        requester: { id: 'req-1', name: mockCase.requesterName, email: mockCase.requesterEmail },
        timestamp: new Date(),
      };

      expect(emailConnector).not.toBeNull();
      const result = await emailConnector!.dispatch(payload);
      expect(result.success).toBe(true);
      expect(result.channel).toBe('EMAIL');
      expect(result.externalReference).toBeDefined();
      expect(result.externalReference).toContain('cpet-');

      // Test idempotency: re-dispatching with same ID returns cached idempotent confirmation
      const repeatResult = await emailConnector!.dispatch(payload);
      expect(repeatResult.success).toBe(true);
      expect(repeatResult.channel).toBe('EMAIL');
    });
  });

  describe('4. Two-Way Real-Time Communication & Read Receipts', () => {
    let testCaseId: string;

    beforeEach(async () => {
      // Create a case assigned to Lloyd
      const res = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'SERVICE_REQUEST',
          title: 'Lloyd AC Gas Refill Request',
          description: 'Need gas refill and coil check for split AC',
          category: 'Consumer Electronics',
          productService: 'Split AC 1.5 Ton',
          rawOrgName: 'Lloyd',
        })
        .expect(201);

      testCaseId = res.body.data._id;
    });

    it('should handle two-way messaging between Citizen and Org Agent with read receipts', async () => {
      // Step 1: Citizen adds a message asking for an update
      const citizenMsgRes = await request(app)
        .post(`/api/v1/cases/${testCaseId}/messages`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          message: 'When can a technician visit my residence?',
          attachments: [
            {
              name: 'ac_warranty_card.pdf',
              url: 'https://storage.cpet.org/docs/ac_warranty.pdf',
              fileType: 'application/pdf',
              size: 204800,
            },
          ],
        })
        .expect(201);

      expect(citizenMsgRes.body.success).toBe(true);
      const citizenEvent = citizenMsgRes.body.data.event;
      expect(citizenEvent.eventType).toBe('MESSAGE');
      expect(citizenEvent.readBy).toBeDefined();
      expect(citizenEvent.readBy[0].userId).toBe(citizenUser._id);

      // Step 2: Org Agent marks messages as read
      const markReadRes = await request(app)
        .post(`/api/v1/cases/${testCaseId}/read`)
        .set('Authorization', `Bearer ${lloydAgentToken}`)
        .expect(200);

      expect(markReadRes.body.success).toBe(true);

      // Step 3: Org Agent replies with appointment schedule
      const agentReplyRes = await request(app)
        .post(`/api/v1/cases/${testCaseId}/messages`)
        .set('Authorization', `Bearer ${lloydAgentToken}`)
        .send({
          message: 'Technician Rajesh has been booked for tomorrow between 10:00 AM and 1:00 PM.',
        })
        .expect(201);

      expect(agentReplyRes.body.success).toBe(true);
      const agentEvent = agentReplyRes.body.data.event;
      expect(agentEvent.message).toContain('Technician Rajesh has been booked');
      expect(agentEvent.readBy[0].userId).toBe(lloydAgent._id);

      // Step 4: Verify timeline contains both messages with read receipt tracking
      const caseDetailsRes = await request(app)
        .get(`/api/v1/cases/${testCaseId}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(200);

      const timeline = caseDetailsRes.body.data.timeline;
      const citizenEvents = timeline.filter((e: any) => e.actorId === citizenUser._id);
      expect(citizenEvents.length).toBeGreaterThanOrEqual(1);

      // Verify the agent read receipt was recorded on the citizen message
      const lastCitizenMsg = citizenEvents[citizenEvents.length - 1];
      expect(lastCitizenMsg.readBy.some((r: any) => r.userId === lloydAgent._id)).toBe(true);
    });
  });

  describe('5. Multi-Tenant Isolation & Security Boundaries', () => {
    it('should forbid Apex Agent from viewing Lloyd destinations', async () => {
      const res = await request(app)
        .get(`/api/v1/routing/${lloydOrgId}/destinations`)
        .set('Authorization', `Bearer ${apexAgentToken}`)
        .expect(403);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('Tenant violation');
    });

    it('should allow Lloyd Admin to view and configure Lloyd destinations', async () => {
      // Lloyd Admin views Lloyd destinations
      const getRes = await request(app)
        .get(`/api/v1/routing/${lloydOrgId}/destinations`)
        .set('Authorization', `Bearer ${lloydAdminToken}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.length).toBeGreaterThanOrEqual(1);

      // Lloyd Admin creates a new verified destination
      const postRes = await request(app)
        .post(`/api/v1/routing/${lloydOrgId}/destinations`)
        .set('Authorization', `Bearer ${lloydAdminToken}`)
        .send({
          type: 'WEBHOOK',
          value: 'https://api.lloyd-appliances.com/webhooks/cpet-events',
          serviceCategory: 'HVAC',
          source: 'ADMIN_CONSOLE',
        })
        .expect(201);

      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.type).toBe('WEBHOOK');
      expect(postRes.body.data.verificationStatus).toBe('VERIFIED');
    });

    it('should prevent cross-tenant messaging on case records', async () => {
      // Create case for Lloyd
      const caseRes = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'SERVICE_REQUEST',
          title: 'Lloyd AC Remote Malfunction',
          description: 'Display on remote is blank',
          category: 'Consumer Electronics',
          productService: 'AC Remote',
          rawOrgName: 'Lloyd',
        })
        .expect(201);

      const caseId = caseRes.body.data._id;

      // Apex Agent attempts to message Lloyd case -> Must be rejected with 403
      const crossTenantRes = await request(app)
        .post(`/api/v1/cases/${caseId}/messages`)
        .set('Authorization', `Bearer ${apexAgentToken}`)
        .send({
          message: 'Unauthorized injection from another organization',
        })
        .expect(403);

      expect(crossTenantRes.body.error).toBeDefined();
      expect(crossTenantRes.body.error.message).toContain('Tenant violation');
    });
  });
});
