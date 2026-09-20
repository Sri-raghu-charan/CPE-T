import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { memoryStore } from '../infrastructure/store.js';
import { domainService } from '../modules/domains/domain.service.js';
import { bloodService } from '../modules/domains/blood.service.js';
import { aiService } from '../modules/ai/ai.service.js';
import { caseService } from '../modules/cases/case.service.js';

describe('Phase 6 — Domain Modules: Service Requests, Complaints & Blood', () => {
  const app = createApp();
  let citizenToken: string;
  let citizenId: string;
  let samsungOrgId: string;
  let redCrossOrgId: string;

  beforeEach(async () => {
    // Reset memory store to pristine seeded state
    memoryStore.seedDefaults();

    // Login as Dev Citizen
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'citizen@cpet.org',
      password: 'Password123!',
    });
    citizenToken = loginRes.body.data.tokens.accessToken;
    citizenId = loginRes.body.data.user.id;

    samsungOrgId = '66d000000000000000000040';
    redCrossOrgId = '66d000000000000000000050';
  });

  // =========================================================================
  // 1. DOMAIN CONFIGURATION & SCHEMA ENGINE REUSE
  // =========================================================================
  describe('1. Domain Configuration & Schema Validation', () => {
    it('provides configurations for SERVICE_REQUEST, COMPLAINT, BLOOD_REQUEST, and GRIEVANCE', async () => {
      const res = await request(app).get('/api/v1/domains');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const configs = res.body.data;
      const types = configs.map((c: any) => c.type);
      expect(types).toContain('SERVICE_REQUEST');
      expect(types).toContain('COMPLAINT');
      expect(types).toContain('BLOOD_REQUEST');
      expect(types).toContain('GRIEVANCE');
    });

    it('calculates domain-specific SLAs correctly (e.g. emergency blood 6h vs appliance 48h)', () => {
      const bloodSla = domainService.calculateDomainSlaHours('BLOOD_REQUEST', 'URGENT');
      expect(bloodSla).toBe(6);

      const serviceSla = domainService.calculateDomainSlaHours('SERVICE_REQUEST', 'MEDIUM');
      expect(serviceSla).toBe(48);
    });

    it('validates structuredData schemas per domain', () => {
      // Valid service request
      const validService = domainService.validateStructuredData('SERVICE_REQUEST', {
        issueType: 'Cooling Defect / Gas Check',
        brand: 'Samsung',
        serialNumber: 'SN-SAM-1234',
      });
      expect(validService.issueType).toBe('Cooling Defect / Gas Check');

      // Invalid blood request (missing blood group)
      expect(() => {
        domainService.validateStructuredData('BLOOD_REQUEST', {
          unitsNeeded: 2,
          // bloodGroup missing
        });
      }).toThrow();
    });
  });

  // =========================================================================
  // 2. UNIVERSAL MULTI-BRAND SERVICE REQUESTS
  // =========================================================================
  describe('2. Universal Multi-Brand Service Requests', () => {
    it('dynamically identifies Samsung brand from natural language and routes to Samsung organization', async () => {
      const intake = await aiService.analyzeIntake({
        message: 'I have a Samsung split AC and it has a cooling defect in Hitec City, Hyderabad',
        languageHint: 'auto',
      });

      expect(intake.intent).toBe('SERVICE_REQUEST');
      expect(intake.organization.matchedName).toContain('Samsung');
      expect(intake.productService).toContain('Air Conditioner');

      // Create official case through shared engine
      const user = { _id: citizenId, name: 'Dev Citizen', email: 'citizen@cpet.org', role: 'CITIZEN' as const };
      const createdCase = await caseService.createCase(
        {
          type: 'SERVICE_REQUEST',
          title: intake.summary,
          description: 'Cooling gas defect in Samsung Split AC',
          category: intake.category,
          productService: intake.productService,
          priority: intake.priority,
          organizationId: intake.organization.matchedId,
          rawOrgName: 'Samsung',
          structuredData: intake.structuredData,
          location: { city: 'Hyderabad', address: 'Hitec City' },
        } as any,
        user as any
      );

      expect(createdCase.organizationId.toString()).toBe(samsungOrgId);
      expect((createdCase as any).organizationName).toContain('Samsung');
      expect(createdCase.routing?.destinationType).toBe('INTERNAL_QUEUE');
      expect(createdCase.routing?.destinationValue).toBe('samsung-triage-queue');
      expect(createdCase.sla.slaHours).toBe(48);
    });

    it('works across different brands (Lloyd, Samsung, Apex) without hardcoded brand logic', async () => {
      const lloydIntake = await aiService.analyzeIntake({
        message: 'Need AC servicing for my Lloyd AC in Begumpet',
        languageHint: 'auto',
      });
      expect(lloydIntake.organization.matchedName).toContain('Lloyd');

      const apexIntake = await aiService.analyzeIntake({
        message: 'High voltage transformer line fault near civic center',
        languageHint: 'auto',
      });
      expect(apexIntake.organization.matchedName).toContain('Apex');
    });
  });

  // =========================================================================
  // 3. UNIVERSAL COMPLAINT INTAKE & SCHEMAS
  // =========================================================================
  describe('3. Universal Complaints Against Multiple Target Types', () => {
    it('supports complaints against institutions (e.g. hospital care deficiency)', async () => {
      const intake = await aiService.analyzeIntake({
        message: 'Formal complaint against City Care Hospital for billing overcharge beyond package',
        languageHint: 'auto',
      });

      expect(intake.intent).toBe('COMPLAINT');
      expect(intake.structuredData.targetType).toBe('INSTITUTION');
      expect(intake.structuredData.complaintType).toBe('Billing Dispute');
    });

    it('supports complaints against facilities (e.g. public transit bus breakdown)', async () => {
      const intake = await aiService.analyzeIntake({
        message: 'Complaint regarding terminal 3 civic bus route delay and service deficiency',
        languageHint: 'auto',
      });

      expect(intake.intent).toBe('COMPLAINT');
      expect(intake.structuredData.targetType).toBe('FACILITY');
    });

    it('creates complaint case with escalation workflow and 48h SLA', async () => {
      const user = { _id: citizenId, name: 'Dev Citizen', email: 'citizen@cpet.org', role: 'CITIZEN' as const };
      const createdCase = await caseService.createCase(
        {
          type: 'COMPLAINT',
          title: 'Excessive billing overcharge grievance',
          description: 'Meter calibrated incorrectly leading to 3x tariff spike',
          category: 'Commercial Disputes',
          priority: 'HIGH',
          structuredData: {
            targetType: 'ORGANIZATION',
            targetName: 'Apex Power & Water',
            complaintType: 'Billing Dispute',
            disputedAmount: '₹ 8,400',
            incidentDate: '2026-09-10',
          },
          location: { city: 'Metro City' },
        } as any,
        user as any
      );

      expect(createdCase.type).toBe('COMPLAINT');
      expect(createdCase.status).toBe('SUBMITTED');
      expect(createdCase.sla.slaHours).toBe(24); // High priority complaint = 24h
    });
  });

  // =========================================================================
  // 4. PROGRESSIVE 5-LEVEL BLOOD DISCOVERY HIERARCHY
  // =========================================================================
  describe('4. Blood Requirement & 5-Level Progressive Discovery Hierarchy', () => {
    it('searches availability progressively through all 5 levels for O- blood', async () => {
      const searchRes = await bloodService.searchBloodAvailability({
        bloodGroup: 'O-',
        locality: 'Madhapur',
        municipality: 'Greater Hyderabad',
        subDistrict: 'Serilingampally',
        district: 'Hyderabad',
        state: 'Telangana',
        coordinates: [78.3845, 17.4483], // Madhapur center
      });

      expect(searchRes.bloodGroup).toBe('O-');
      expect(searchRes.totalAvailable).toBeGreaterThanOrEqual(5);

      // Verify 5 distinct levels exist
      const l1 = searchRes.hierarchy.find((h) => h.level === 1);
      const l2 = searchRes.hierarchy.find((h) => h.level === 2);
      const l3 = searchRes.hierarchy.find((h) => h.level === 3);
      const l4 = searchRes.hierarchy.find((h) => h.level === 4);
      const l5 = searchRes.hierarchy.find((h) => h.level === 5);

      expect(l1?.count).toBeGreaterThanOrEqual(1); // Madhapur
      expect(l2?.count).toBeGreaterThanOrEqual(1); // Gachibowli
      expect(l3?.count).toBeGreaterThanOrEqual(1); // Serilingampally
      expect(l4?.count).toBeGreaterThanOrEqual(1); // Secunderabad
      expect(l5?.count).toBeGreaterThanOrEqual(1); // Warangal
    });

    it('filters discovery by configurable radius (e.g. radiusKm=15 excludes statewide Warangal)', async () => {
      const searchRes = await bloodService.searchBloodAvailability({
        bloodGroup: 'O-',
        locality: 'Madhapur',
        coordinates: [78.3845, 17.4483],
        radiusKm: 15,
      });

      // Warangal is ~140km away, should be excluded
      const warangalDonor = searchRes.results.find((d) => d.anonymousDonorCode === 'DONOR-WGL-1005');
      expect(warangalDonor).toBeUndefined();

      // Local donors within 15km must be included
      const localDonor = searchRes.results.find((d) => d.anonymousDonorCode === 'DONOR-HYD-1001');
      expect(localDonor).toBeDefined();
    });

    it('exposes discovery search via public HTTP GET /api/v1/blood/search', async () => {
      const res = await request(app).get('/api/v1/blood/search').query({
        bloodGroup: 'O-',
        locality: 'Madhapur',
        radiusKm: 25,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hierarchy).toHaveLength(5);
    });
  });

  // =========================================================================
  // 5. STRICT DONOR PRIVACY GUARANTEE
  // =========================================================================
  describe('5. Strict Donor Privacy Safeguard', () => {
    it('NEVER exposes donor contactPhone, contactEmail, or exact coordinates in discovery search', async () => {
      const res = await request(app).get('/api/v1/blood/search').query({
        bloodGroup: 'O-',
        locality: 'Madhapur',
      });

      expect(res.status).toBe(200);
      const results = res.body.data.results;
      expect(results.length).toBeGreaterThan(0);

      for (const donor of results) {
        // Assert absence of private PII
        expect(donor.contactPhone).toBeUndefined();
        expect(donor.contactEmail).toBeUndefined();
        expect(donor.userId).toBeUndefined();
        expect(donor.name).toBeUndefined();

        // Assert presence of anonymous safe code
        expect(donor.anonymousDonorCode).toMatch(/^DONOR-[A-Z]+-\d+/);
        expect(donor.approximateLocation.locality).toBeDefined();
        // Exact coordinates should NOT be in public profile
        expect(donor.approximateLocation.coordinates).toBeUndefined();
      }
    });
  });

  // =========================================================================
  // 6. DONOR REGISTRATION & STATUS MANAGEMENT
  // =========================================================================
  describe('6. Donor Registration & Status Management', () => {
    it('allows a citizen to register as a voluntary blood donor', async () => {
      const res = await request(app)
        .post('/api/v1/blood/donors/register')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          bloodGroup: 'B+',
          approximateLocation: {
            locality: 'Banjara Hills',
            municipality: 'Greater Hyderabad',
            district: 'Hyderabad',
            state: 'Telangana',
            pincode: '500034',
          },
          contactPreference: 'IN_APP',
          contactPhone: '+91 9988776655',
          contactEmail: 'citizen@cpet.org',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.anonymousDonorCode).toMatch(/^DONOR-[A-Z]+-\d+/);
    });

    it('allows authenticated donor to view their profile and toggle availability status', async () => {
      // View my donor profile
      const meRes = await request(app)
        .get('/api/v1/blood/donors/me')
        .set('Authorization', `Bearer ${citizenToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data).toBeDefined();
      expect(meRes.body.data.bloodGroup).toBe('O-');

      // Toggle status to UNAVAILABLE
      const updateRes = await request(app)
        .put('/api/v1/blood/donors/status')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ status: 'UNAVAILABLE' });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.updated).toBe(true);

      // Search should now exclude this donor
      const searchRes = await bloodService.searchBloodAvailability({
        bloodGroup: 'O-',
        locality: 'Madhapur',
      });
      const found = searchRes.results.find((d) => d.anonymousDonorCode === 'DONOR-HYD-1001');
      expect(found).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. SAFE CONTACT / ALERT RELAY
  // =========================================================================
  describe('7. Safe Contact Relay Mechanism', () => {
    it('dispatches a safe emergency alert to donor without exposing donor contact to requester', async () => {
      const res = await request(app)
        .post('/api/v1/blood/contact')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          anonymousDonorCode: 'DONOR-HYD-1002',
          hospitalName: 'Apollo Trauma Hospital, Jubilee Hills',
          unitsNeeded: 2,
          urgency: 'CRITICAL_IMMEDIATE',
          attendantPhone: '+91 9876543210',
          message: 'Patient in emergency surgery needing O- blood immediately.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.relayId).toMatch(/^RELAY-/);
      expect(res.body.data.message).toContain('DONOR-HYD-1002');
      // Must NOT leak donor's phone number in response
      expect(JSON.stringify(res.body)).not.toContain('+91 9876543211');
    });
  });

  // =========================================================================
  // 8. CASE CREATION & ROUTING REUSE FOR BLOOD REQUESTS
  // =========================================================================
  describe('8. Shared Case Engine Reuse for Blood Requests', () => {
    it('creates an emergency blood case routed to Red Cross Blood Center with 6h SLA', async () => {
      const user = { _id: citizenId, name: 'Dev Citizen', email: 'citizen@cpet.org', role: 'CITIZEN' as const };
      const bloodCase = await caseService.createCase(
        {
          type: 'BLOOD_REQUEST',
          title: 'Emergency 2 Units O- Required at Metro City Hospital',
          description: 'Emergency trauma surgery requirement for O-Negative blood',
          category: 'Emergency Healthcare',
          priority: 'URGENT',
          structuredData: {
            bloodGroup: 'O-',
            unitsNeeded: 2,
            hospitalName: 'Metro City Hospital',
            patientName: 'K. Rao',
            urgency: 'CRITICAL_IMMEDIATE',
            contactPhone: '+91 9876543210',
            requesterRelationship: 'FAMILY',
          },
          location: { city: 'Hyderabad', address: 'Madhapur' },
        } as any,
        user as any
      );

      expect(bloodCase.type).toBe('BLOOD_REQUEST');
      expect(bloodCase.priority).toBe('URGENT');
      expect(bloodCase.sla.slaHours).toBe(6); // Emergency blood SLA = 6h
      expect(bloodCase.organizationId.toString()).toBe(redCrossOrgId);
      expect((bloodCase as any).organizationName).toContain('Red Cross');
      expect(bloodCase.routing?.destinationValue).toBe('redcross-blood-desk');

      // Test message loop on blood case
      const res = await caseService.addMessage(
        bloodCase._id.toString(),
        {
          message: 'Blood bank verified matching donor availability in Madhapur.',
        } as any,
        {
          _id: '66d000000000000000000052',
          name: 'Red Cross Coordinator',
          role: 'ORGANIZATION_AGENT',
          organizationId: redCrossOrgId,
        } as any
      );
      expect(res.event.eventType).toBe('MESSAGE');
      expect(res.event.message).toContain('Madhapur');
    });
  });
});
