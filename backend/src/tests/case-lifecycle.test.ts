import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { memoryStore } from '../infrastructure/store.js';

describe('Phase 3 — Universal Request, Case, Tracking & Audit Engine', () => {
  const app = createApp();

  const orgAId = '66d000000000000000000010';
  const orgBId = '66d000000000000000000020';

  const citizenUser = {
    _id: '66d000000000000000000099',
    name: 'Dev Citizen',
    email: 'citizen@cpet.org',
    role: 'CITIZEN' as const,
    organizationId: null,
    isActive: true,
  };

  const otherCitizen = {
    _id: '66d000000000000000000088',
    name: 'Other Citizen',
    email: 'other@cpet.org',
    role: 'CITIZEN' as const,
    organizationId: null,
    isActive: true,
  };

  const orgAAdmin = {
    _id: '66d000000000000000000011',
    name: 'Apex Admin',
    email: 'admin@apexutility.org',
    role: 'ORGANIZATION_ADMIN' as const,
    organizationId: orgAId,
    isActive: true,
  };

  const orgAAgent = {
    _id: '66d000000000000000000012',
    name: 'Apex Agent Alice',
    email: 'alice@apexutility.org',
    role: 'ORGANIZATION_AGENT' as const,
    organizationId: orgAId,
    isActive: true,
  };

  const orgBAgent = {
    _id: '66d000000000000000000021',
    name: 'Org B Agent Bob',
    email: 'bob@orgb.org',
    role: 'ORGANIZATION_AGENT' as const,
    organizationId: orgBId,
    isActive: true,
  };

  function createToken(user: { _id: string; email: string; role: any; organizationId?: string | null }) {
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
    // Register test users and organizations in memoryStore
    memoryStore.users.set(citizenUser._id, citizenUser as any);
    memoryStore.users.set(otherCitizen._id, otherCitizen as any);
    memoryStore.users.set(orgAAdmin._id, orgAAdmin as any);
    memoryStore.users.set(orgAAgent._id, orgAAgent as any);
    memoryStore.users.set(orgBAgent._id, orgBAgent as any);

    memoryStore.organizations.set(orgBId, {
      _id: orgBId,
      name: 'Metro City Transport',
      slug: 'metro-city-transport',
      type: 'TRANSPORT',
      category: 'Public Transport',
      status: 'VERIFIED',
      contactEmail: 'contact@mct.org',
      settings: { autoAssign: false, defaultSlaHours: 24 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('1. Universal Case Creation: raises SERVICE_REQUEST, COMPLAINT, and BLOOD_REQUEST', async () => {
    const token = createToken(citizenUser);

    // 1.1 Raise Service Request
    const srvRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'SERVICE_REQUEST',
        title: 'Defective Transformer Power Fluctuation',
        description: 'Power surges recorded repeatedly causing appliance failures.',
        category: 'Electrical Utilities',
        organizationId: orgAId,
        priority: 'HIGH',
        structuredData: {
          meterNumber: 'MTR-9921',
          voltageObserved: '280V',
        },
      });

    expect(srvRes.status).toBe(201);
    expect(srvRes.body.success).toBe(true);
    expect(srvRes.body.data.referenceNumber).toMatch(/^CPET-\d{4}-\d{5}$/);
    expect(srvRes.body.data.status).toBe('SUBMITTED');
    expect(srvRes.body.data.sla).toHaveProperty('dueAt');
    expect(srvRes.body.data.version).toBe(1);

    // 1.2 Raise Blood Request with dynamic structured data
    const bloodRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'BLOOD_REQUEST',
        title: 'Urgent 2 Units O-Negative Required',
        description: 'Emergency trauma transfusion at Central City Hospital.',
        category: 'Emergency Blood',
        organizationId: orgAId,
        priority: 'URGENT',
        structuredData: {
          bloodGroup: 'O-',
          unitsNeeded: 2,
          hospitalName: 'Central City Hospital',
          urgencyLevel: 'IMMEDIATE',
        },
      });

    expect(bloodRes.status).toBe(201);
    expect(bloodRes.body.data.type).toBe('BLOOD_REQUEST');
    expect(bloodRes.body.data.priority).toBe('URGENT');
    expect(bloodRes.body.data.structuredData.bloodGroup).toBe('O-');
  });

  it('2. Complete Valid Lifecycle: SUBMITTED -> ACKNOWLEDGED -> ASSIGNED -> IN_PROGRESS -> WAITING_FOR_USER -> WAITING_FOR_ORGANIZATION -> RESOLVED -> CLOSED', async () => {
    const citizenToken = createToken(citizenUser);
    const agentToken = createToken(orgAAgent);
    const adminToken = createToken(orgAAdmin);

    // Step A: Citizen creates case
    const createRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'COMPLAINT',
        title: 'Contaminated Water Supply Line',
        description: 'Turbid water emitting odor reported across building block.',
        category: 'Water Quality',
        organizationId: orgAId,
        priority: 'HIGH',
      });
    expect(createRes.status).toBe(201);
    const caseId = createRes.body.data._id;
    let currentVersion = createRes.body.data.version;

    // Step B: Org Agent Acknowledges case
    const ackRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        targetStatus: 'ACKNOWLEDGED',
        message: 'Receipt acknowledged. Scheduled inspection team triage.',
        expectedVersion: currentVersion,
      });
    expect(ackRes.status).toBe(200);
    expect(ackRes.body.data.case.status).toBe('ACKNOWLEDGED');
    currentVersion = ackRes.body.data.case.version;

    // Step C: Org Admin Assigns Agent Alice
    const assignRes = await request(app)
      .post(`/api/v1/cases/${caseId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        agentId: orgAAgent._id,
        notes: 'Lead investigator assigned for water sample testing.',
      });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.case.status).toBe('ASSIGNED');
    expect(assignRes.body.data.case.assignedAgentId).toBe(orgAAgent._id);
    currentVersion = assignRes.body.data.case.version;

    // Step D: Agent sets IN_PROGRESS
    const inProgRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        targetStatus: 'IN_PROGRESS',
        message: 'Field technician on-site collecting pipeline samples.',
        expectedVersion: currentVersion,
      });
    expect(inProgRes.status).toBe(200);
    expect(inProgRes.body.data.case.status).toBe('IN_PROGRESS');
    currentVersion = inProgRes.body.data.case.version;

    // Step E: Agent requests clarification (WAITING_FOR_USER)
    const waitUserRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        targetStatus: 'WAITING_FOR_USER',
        message: 'Please specify the exact apartment numbers experiencing discolored water.',
        expectedVersion: currentVersion,
      });
    expect(waitUserRes.status).toBe(200);
    expect(waitUserRes.body.data.case.status).toBe('WAITING_FOR_USER');
    currentVersion = waitUserRes.body.data.case.version;

    // Step F: Citizen responds (Auto-transitions to WAITING_FOR_ORGANIZATION)
    const replyRes = await request(app)
      .post(`/api/v1/cases/${caseId}/messages`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        message: 'Apartments 401 through 408 on the 4th floor are all affected.',
      });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.case.status).toBe('WAITING_FOR_ORGANIZATION');
    currentVersion = replyRes.body.data.case.version;

    // Step G: Agent Resolves case
    const resolveRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        targetStatus: 'RESOLVED',
        message: 'Main filtration manifold flushed and sterilized. Secondary tests conform to potable limits.',
        expectedVersion: currentVersion,
        resolution: {
          summary: 'Sterilization and flush completed successfully.',
        },
      });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.case.status).toBe('RESOLVED');
    currentVersion = resolveRes.body.data.case.version;

    // Step H: Citizen Confirms Closure
    const closeRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        targetStatus: 'CLOSED',
        message: 'Water clarity verified normal. Closing case with thanks.',
        expectedVersion: currentVersion,
      });
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.case.status).toBe('CLOSED');

    // Step I: Verify Full Timeline
    const timelineRes = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(timelineRes.status).toBe(200);
    expect(timelineRes.body.data.timeline.length).toBeGreaterThanOrEqual(7);
  });

  it('3. State Machine Guard: Rejects invalid status transition jumps with 400 Bad Request', async () => {
    const citizenToken = createToken(citizenUser);
    const agentToken = createToken(orgAAgent);

    const createRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'SERVICE_REQUEST',
        title: 'Meter Recalibration Request',
        description: 'Annual verification check.',
        category: 'Metering',
        organizationId: orgAId,
        priority: 'LOW',
      });
    const caseId = createRes.body.data._id;

    // Attempt invalid jump: SUBMITTED -> CLOSED directly
    const invalidJump = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        targetStatus: 'CLOSED',
        message: 'Attempting to skip straight to closure.',
      });

    expect(invalidJump.status).toBe(400);
    expect(invalidJump.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalidJump.body.error.message).toContain('Invalid state transition');
  });

  it('4. RBAC Authorization: Citizen cannot trigger Organization transitions (Acknowledge/Resolve)', async () => {
    const citizenToken = createToken(citizenUser);

    const createRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'COMPLAINT',
        title: 'Noise from Substation Cooler',
        description: 'Persistent hum exceeds night decibel limit.',
        category: 'Noise',
        organizationId: orgAId,
        priority: 'MEDIUM',
      });
    const caseId = createRes.body.data._id;

    // Citizen attempts to acknowledge their own request
    const unauthorizedAction = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        targetStatus: 'ACKNOWLEDGED',
        message: 'Citizen illegally trying to acknowledge',
      });

    expect(unauthorizedAction.status).toBe(403);
    expect(unauthorizedAction.body.error.code).toBe('FORBIDDEN');
    expect(unauthorizedAction.body.error.message).toContain("Role 'CITIZEN' is not authorized");
  });

  it('5. Tenant Isolation: Org B agent cannot view or modify Org A cases', async () => {
    const citizenToken = createToken(citizenUser);
    const orgBToken = createToken(orgBAgent);

    // Case belongs to Org A
    const createRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'SERVICE_REQUEST',
        title: 'High Voltage Transformer Inspection',
        description: 'Private industrial substation check.',
        category: 'High Voltage',
        organizationId: orgAId,
        priority: 'HIGH',
      });
    const caseId = createRes.body.data._id;

    // Org B agent attempts to access Org A case details
    const viewRes = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set('Authorization', `Bearer ${orgBToken}`);

    expect(viewRes.status).toBe(403);
    expect(viewRes.body.error.code).toBe('FORBIDDEN');
    expect(viewRes.body.error.message).toContain('Tenant violation');

    // Org B agent attempts to transition status of Org A case
    const transRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({
        targetStatus: 'ACKNOWLEDGED',
        message: 'Cross-tenant illegal transition attempt',
      });

    expect(transRes.status).toBe(403);
    expect(transRes.body.error.code).toBe('FORBIDDEN');
  });

  it('6. Audit Event Immutability: Citizen cannot see internal organization notes', async () => {
    const citizenToken = createToken(citizenUser);
    const agentToken = createToken(orgAAgent);

    const createRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'COMPLAINT',
        title: 'Billing Overcharge Dispute',
        description: 'Charged commercial rate instead of residential tariff.',
        category: 'Billing',
        organizationId: orgAId,
        priority: 'HIGH',
      });
    const caseId = createRes.body.data._id;

    // Agent posts an internal note
    await request(app)
      .post(`/api/v1/cases/${caseId}/messages`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        message: 'INTERNAL NOTE: Meter reader typo identified. Approving tariff credit.',
        isInternal: true,
      });

    // Citizen views case details
    const citizenView = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(citizenView.status).toBe(200);
    const hasInternal = citizenView.body.data.timeline.some((e: any) => e.isInternal === true);
    expect(hasInternal).toBe(false);

    // Agent views case details -> Internal note IS visible
    const agentView = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(agentView.status).toBe(200);
    const agentHasInternal = agentView.body.data.timeline.some((e: any) => e.isInternal === true);
    expect(agentHasInternal).toBe(true);
  });

  it('7. Optimistic Concurrency Control: Rejects transition if version does not match', async () => {
    const citizenToken = createToken(citizenUser);
    const agentToken = createToken(orgAAgent);

    const createRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'SERVICE_REQUEST',
        title: 'Street Lamp Replacement',
        description: 'Pole lamp dark outside community hall.',
        category: 'Lighting',
        organizationId: orgAId,
        priority: 'LOW',
      });
    const caseId = createRes.body.data._id;

    // Attempt transition with outdated expectedVersion (e.g. 99 instead of 1)
    const staleRes = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        targetStatus: 'ACKNOWLEDGED',
        message: 'Attempt with stale version',
        expectedVersion: 99,
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe('CONFLICT');
    expect(staleRes.body.error.message).toContain('modified by another concurrent action');
  });
});
