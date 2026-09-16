import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { memoryStore } from '../infrastructure/store.js';
import { caseService } from '../modules/cases/case.service.js';

describe('Phase 8 — Complete Integration, End-to-End QA & Production Polish', () => {
  const app = createApp();

  const lloydOrgId = '66d000000000000000000030';
  const apexOrgId = '66d000000000000000000010';

  const citizenUser = {
    _id: '66d000000000000000000099',
    name: 'Dev Citizen',
    email: 'citizen@cpet.org',
    role: 'CITIZEN' as const,
    organizationId: null,
  };

  const otherCitizen = {
    _id: '66d000000000000000000088',
    name: 'Other Citizen',
    email: 'other@cpet.org',
    role: 'CITIZEN' as const,
    organizationId: null,
  };

  const lloydAgent = {
    _id: '66d000000000000000000032',
    name: 'Lloyd Support Specialist',
    email: 'support@lloyd.in',
    role: 'ORGANIZATION_AGENT' as const,
    organizationId: lloydOrgId,
  };

  const apexAgent = {
    _id: '66d000000000000000000012',
    name: 'Apex Agent Alice',
    email: 'alice@apexutility.org',
    role: 'ORGANIZATION_AGENT' as const,
    organizationId: apexOrgId,
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
  const otherCitizenToken = createToken(otherCitizen);
  const lloydToken = createToken(lloydAgent);
  const apexToken = createToken(apexAgent);

  beforeEach(() => {
    memoryStore.seedDefaults();
    memoryStore.users.set(otherCitizen._id, {
      ...otherCitizen,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      consent: {
        termsAccepted: true,
        termsVersion: '1.0',
        acceptedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('1. Full End-to-End User Journey Loop', () => {
    it('executes: intake -> routing -> two-way comms -> resolution -> confirmation -> feedback', async () => {
      // Step A: Citizen creates Service Request
      const createRes = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'SERVICE_REQUEST',
          title: 'Service Request: Lloyd AC Servicing',
          description: 'Citizen: I have a Lloyd Split AC and it needs cooling servicing in Hyderabad',
          category: 'Consumer Electronics & Appliances',
          productService: 'Split AC',
          organizationId: lloydOrgId,
          priority: 'MEDIUM',
          location: {
            city: 'Hyderabad',
            address: 'Banjara Hills, Road No 12',
          },
        });

      expect(createRes.status).toBe(201);
      const createdCase = createRes.body.data;
      const caseId = createdCase._id;
      expect(createdCase.referenceNumber).toContain('CPET-');
      expect(createdCase.status).toBe('SUBMITTED');

      // Step B: Lloyd organization receives request in their tenant queue
      const queueRes = await request(app)
        .get(`/api/v1/organizations/${lloydOrgId}/requests`)
        .set('Authorization', `Bearer ${lloydToken}`);

      expect(queueRes.status).toBe(200);
      const lloydCases = queueRes.body.data;
      expect(lloydCases.some((c: any) => c._id === caseId)).toBe(true);

      // Step C: Organization acknowledges and responds
      const ackRes = await request(app)
        .post(`/api/v1/cases/${caseId}/transition`)
        .set('Authorization', `Bearer ${lloydToken}`)
        .send({
          targetStatus: 'ACKNOWLEDGED',
          message: 'Lloyd technical desk has verified the service request.',
          expectedVersion: createdCase.version,
        });
      expect(ackRes.status).toBe(200);

      // Step D: Organization sends public message
      const msgRes = await request(app)
        .post(`/api/v1/cases/${caseId}/messages`)
        .set('Authorization', `Bearer ${lloydToken}`)
        .send({
          message: 'Technician booked for tomorrow morning between 9:30 AM and 11:00 AM.',
          isInternal: false,
        });
      expect(msgRes.status).toBe(201);

      // Step E: Citizen replies back
      const replyRes = await request(app)
        .post(`/api/v1/cases/${caseId}/messages`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          message: 'Thank you! The address gate code is 4492.',
          isInternal: false,
        });
      expect(replyRes.status).toBe(201);

      // Step F: Organization progresses to IN_PROGRESS then marks RESOLVED
      const progRes = await request(app)
        .post(`/api/v1/cases/${caseId}/transition`)
        .set('Authorization', `Bearer ${lloydToken}`)
        .send({
          targetStatus: 'IN_PROGRESS',
          message: 'Technician on-site performing AC chemical wash and coil cleaning.',
          expectedVersion: ackRes.body.data.case.version,
        });
      expect(progRes.status).toBe(200);

      const resolveRes = await request(app)
        .post(`/api/v1/cases/${caseId}/transition`)
        .set('Authorization', `Bearer ${lloydToken}`)
        .send({
          targetStatus: 'RESOLVED',
          message: 'AC servicing completed successfully. Cooling restored to optimal 18C.',
          resolution: {
            summary: 'AC chemical wash and refrigerant gas top-up performed.',
            notes: 'Replaced air filter and tested thermostat response.',
          },
          expectedVersion: progRes.body.data.case.version,
        });
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.case.status).toBe('RESOLVED');

      // Step G: Citizen confirms resolution and closes the case
      const closeRes = await request(app)
        .post(`/api/v1/cases/${caseId}/transition`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          targetStatus: 'CLOSED',
          message: 'Verified cooling performance. Fully satisfied with technician Rajesh.',
          expectedVersion: resolveRes.body.data.case.version,
        });
      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.case.status).toBe('CLOSED');

      // Step H: Citizen submits 5-star satisfaction feedback
      const feedbackRes = await request(app)
        .post(`/api/v1/cases/${caseId}/feedback`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          rating: 5,
          comments: 'Superb service, technician was on time and explained everything clearly!',
        });

      expect(feedbackRes.status).toBe(200);
      expect(feedbackRes.body.success).toBe(true);
      expect(feedbackRes.body.data.feedback.rating).toBe(5);
      expect(feedbackRes.body.data.feedback.comments).toContain('Superb service');

      // Step I: Verify case details reflect feedback and timeline event
      const verifyRes = await request(app)
        .get(`/api/v1/cases/${caseId}`)
        .set('Authorization', `Bearer ${citizenToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('CLOSED');
      expect(verifyRes.body.data.feedback).toBeDefined();
      expect(verifyRes.body.data.feedback.rating).toBe(5);
    });
  });

  describe('2. Feedback Security & Authorization Guards', () => {
    it('rejects feedback from unauthorized non-requester citizens', async () => {
      // Create a case by citizenUser
      const createRes = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'COMPLAINT',
          title: 'Product Complaint',
          description: 'Defective thermostat',
          category: 'Consumer Goods',
          organizationId: lloydOrgId,
          priority: 'MEDIUM',
        });

      const caseId = createRes.body.data._id;

      // Other citizen attempts to submit feedback
      const fraudRes = await request(app)
        .post(`/api/v1/cases/${caseId}/feedback`)
        .set('Authorization', `Bearer ${otherCitizenToken}`)
        .send({
          rating: 1,
          comments: 'Malicious dispute attempt',
        });

      expect(fraudRes.status).toBe(403);
      expect(fraudRes.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects feedback submission if case is not yet resolved or closed', async () => {
      const createRes = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'SUPPORT_REQUEST',
          title: 'Active Support Question',
          description: 'Need warranty card duplicate',
          category: 'Support',
          organizationId: lloydOrgId,
          priority: 'LOW',
        });

      const caseId = createRes.body.data._id;

      // Citizen attempts to submit feedback while still SUBMITTED
      const earlyRes = await request(app)
        .post(`/api/v1/cases/${caseId}/feedback`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          rating: 4,
        });

      expect(earlyRes.status).toBe(400);
      expect(earlyRes.body.error.message).toContain('only be submitted on resolved or closed');
    });

    it('validates rating is between 1 and 5', async () => {
      const createRes = await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'GRIEVANCE',
          title: 'Service Grievance',
          description: 'Resolved grievance',
          category: 'Grievance',
          organizationId: lloydOrgId,
          priority: 'MEDIUM',
        });

      const caseId = createRes.body.data._id;

      // Close it first through valid state machine path
      await caseService.transitionStatus(
        caseId,
        { targetStatus: 'ACKNOWLEDGED', message: 'Ack' },
        { _id: lloydAgent._id, name: lloydAgent.name, email: lloydAgent.email, role: lloydAgent.role, organizationId: lloydOrgId }
      );
      await caseService.transitionStatus(
        caseId,
        { targetStatus: 'IN_PROGRESS', message: 'In progress' },
        { _id: lloydAgent._id, name: lloydAgent.name, email: lloydAgent.email, role: lloydAgent.role, organizationId: lloydOrgId }
      );
      await caseService.transitionStatus(
        caseId,
        { targetStatus: 'RESOLVED', message: 'Resolved' },
        { _id: lloydAgent._id, name: lloydAgent.name, email: lloydAgent.email, role: lloydAgent.role, organizationId: lloydOrgId }
      );
      await caseService.transitionStatus(
        caseId,
        { targetStatus: 'CLOSED', message: 'Closed' },
        { _id: citizenUser._id, name: citizenUser.name, email: citizenUser.email, role: citizenUser.role }
      );

      // Attempt invalid rating 6
      const invalidRes = await request(app)
        .post(`/api/v1/cases/${caseId}/feedback`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          rating: 6,
        });

      expect(invalidRes.status).toBe(400);
    });
  });

  describe('3. Organization Executive Dashboard & Real Tenant Metrics', () => {
    it('returns real aggregated counts and isolates tenant metrics strictly to the organization', async () => {
      // Create 2 cases for Lloyd
      await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'SERVICE_REQUEST',
          title: 'Lloyd AC 1',
          description: 'Lloyd service 1',
          category: 'Consumer Electronics & Appliances',
          organizationId: lloydOrgId,
          priority: 'MEDIUM',
        });

      await request(app)
        .post('/api/v1/cases')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'SERVICE_REQUEST',
          title: 'Lloyd AC 2',
          description: 'Lloyd service 2',
          category: 'Consumer Electronics & Appliances',
          organizationId: lloydOrgId,
          priority: 'HIGH',
        });

      // Fetch Lloyd dashboard
      const lloydDashRes = await request(app)
        .get(`/api/v1/organizations/${lloydOrgId}/dashboard`)
        .set('Authorization', `Bearer ${lloydToken}`);

      expect(lloydDashRes.status).toBe(200);
      const lloydData = lloydDashRes.body.data;
      expect(lloydData.totalRequests).toBeGreaterThanOrEqual(2);
      expect(lloydData.newRequests).toBeGreaterThanOrEqual(2);
      expect(lloydData.recentCases).toBeDefined();
      expect(Array.isArray(lloydData.recentCases)).toBe(true);

      // Fetch Apex dashboard
      const apexDashRes = await request(app)
        .get(`/api/v1/organizations/${apexOrgId}/dashboard`)
        .set('Authorization', `Bearer ${apexToken}`);

      expect(apexDashRes.status).toBe(200);
      const apexData = apexDashRes.body.data;

      // Apex should NOT see Lloyd's recent cases
      for (const c of apexData.recentCases || []) {
        expect(c.organizationId.toString()).toBe(apexOrgId);
      }
    });
  });
});
