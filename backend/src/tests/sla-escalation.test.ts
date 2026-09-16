import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { slaService } from '../modules/sla/sla.service.js';
import { escalationService } from '../modules/escalation/escalation.service.js';
import { escalationQueueService } from '../modules/escalation/escalation.queue.js';
import { caseService } from '../modules/cases/case.service.js';
import { memoryStore } from '../infrastructure/store.js';

describe('Phase 7 — Advanced SLA Engine & Configurable Multi-Tier Escalation', () => {
  const app = createApp();

  beforeEach(() => {
    memoryStore.seedDefaults();
  });

  describe('1. Multi-Milestone SLA Calculation', () => {
    it('calculates acknowledgement, first response, and resolution deadlines', async () => {
      const result = await slaService.calculateSla({
        caseType: 'SERVICE_REQUEST',
        priority: 'MEDIUM',
        organizationId: '66d000000000000000000010', // Apex
      });

      expect(result.benchmarkHours).toBeGreaterThan(0);
      expect(result.acknowledgementDueAt.getTime()).toBeLessThan(result.firstResponseDueAt.getTime());
      expect(result.firstResponseDueAt.getTime()).toBeLessThan(result.resolutionDueAt.getTime());
      expect(result.status).toBe('ON_TRACK');
      expect(result.isEscalated).toBe(false);
    });

    it('enforces immediate 24x7 emergency SLA for Blood Requests bypassing business hours', async () => {
      const now = new Date('2026-10-10T23:00:00Z'); // Saturday night
      const result = await slaService.calculateSla({
        caseType: 'BLOOD_REQUEST',
        priority: 'URGENT',
        createdAt: now,
      });

      expect(result.businessHoursEnabled).toBe(false);
      // Resolution within 6 hours
      const diffHours = (result.resolutionDueAt.getTime() - now.getTime()) / (3600 * 1000);
      expect(diffHours).toBeCloseTo(6, 1);
      // Acknowledgement within 30 minutes
      const diffAckMinutes = (result.acknowledgementDueAt.getTime() - now.getTime()) / (60 * 1000);
      expect(diffAckMinutes).toBeCloseTo(30, 1);
    });
  });

  describe('2. Business Hours & Holiday Calculation', () => {
    it('skips weekends when business hours are enabled', () => {
      // Friday 16:00 (4 PM)
      const friday4pm = new Date('2026-10-09T16:00:00'); // Friday
      // Add 4 business hours with 09:00 - 18:00 window (2h left on Fri -> remainder 2h on Mon morning)
      const result = slaService.addBusinessHours(friday4pm, 4, {
        startHour: 9,
        endHour: 18,
        workingDays: [1, 2, 3, 4, 5],
      });

      // Should land on Monday 11:00 AM
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(11);
    });

    it('skips configured holidays during business hour addition', () => {
      // Monday 15:00 (3 PM)
      const monday = new Date('2026-01-26T15:00:00'); // Republic Day holiday
      const result = slaService.addBusinessHours(monday, 4, {
        startHour: 9,
        endHour: 18,
        workingDays: [1, 2, 3, 4, 5],
        holidays: ['2026-01-26'],
      });

      // Since Jan 26 is holiday, should start on Tuesday Jan 27 09:00 AM + 4h = 13:00 (1 PM)
      expect(result.getDate()).toBe(27);
      expect(result.getHours()).toBe(13);
    });
  });

  describe('3. SLA Milestone Breach Evaluation', () => {
    it('detects acknowledgement breach when case remains SUBMITTED past deadline', () => {
      const pastAck = new Date(Date.now() - 3600 * 1000); // 1h in the past
      const mockCase: any = {
        status: 'SUBMITTED',
        sla: {
          dueAt: new Date(Date.now() + 3600 * 10000),
          acknowledgementDueAt: pastAck,
          firstResponseDueAt: new Date(Date.now() + 3600 * 10000),
          resolutionDueAt: new Date(Date.now() + 3600 * 10000),
        },
      };

      const evalRes = slaService.evaluateCaseSla(mockCase);
      expect(evalRes.isBreached).toBe(true);
      expect(evalRes.status).toBe('BREACHED');
      expect(evalRes.breachedMilestones).toContain('ACKNOWLEDGEMENT');
    });

    it('evaluates case as MET when resolved prior to due date', () => {
      const mockCase: any = {
        status: 'RESOLVED',
        resolvedAt: new Date(Date.now() - 5000),
        sla: {
          dueAt: new Date(Date.now() + 3600 * 10000),
          resolutionDueAt: new Date(Date.now() + 3600 * 10000),
        },
      };

      const evalRes = slaService.evaluateCaseSla(mockCase);
      expect(evalRes.status).toBe('MET');
      expect(evalRes.isBreached).toBe(false);
    });
  });

  describe('4. Configurable Multi-Tier Escalation Engine', () => {
    it('automatically escalates a breached case to Tier 1 and records audit event', async () => {
      const citizenUser = memoryStore.users.get('66d000000000000000000099')!;
      const created = await caseService.createCase(
        {
          type: 'COMPLAINT',
          title: 'Unresolved Electricity Voltage Surges',
          description: 'Power surges burnt home appliances, no response from substation',
          category: 'Consumer Grievance',
          priority: 'URGENT',
          organizationId: '66d000000000000000000010',
        },
        citizenUser as any
      );

      const caseId = created._id.toString();

      // Trigger escalation
      const escalated = await escalationService.executeEscalation(
        caseId,
        'Acknowledgement SLA breached beyond critical threshold',
        'SYSTEM_SLA_BREACH'
      );

      expect(escalated.status).toBe('ESCALATED');
      expect(escalated.sla.isEscalated).toBe(true);
      expect(escalated.sla.currentEscalationTier).toBeDefined();
      expect(escalated.sla.escalationHistory.length).toBe(1);
      expect(escalated.sla.escalationHistory[0].triggeredBy).toBe('SYSTEM_SLA_BREACH');

      // Verify audit event recorded
      const events = memoryStore.caseEvents.get(caseId) || [];
      const escEvent = events.find((e) => e.eventType === 'ESCALATED');
      expect(escEvent).toBeDefined();
      expect(escEvent!.message).toContain('Case escalated to');
    });

    it('progressively escalates to higher tiers on repeated triggers', async () => {
      const citizenUser = memoryStore.users.get('66d000000000000000000099')!;
      const created = await caseService.createCase(
        {
          type: 'SERVICE_REQUEST',
          title: 'Lloyd AC Cooling Breakdown',
          description: 'AC compressor not turning on',
          category: 'Consumer Appliance & Utilities',
          priority: 'HIGH',
          organizationId: '66d000000000000000000030', // Lloyd
        },
        citizenUser as any
      );

      const caseId = created._id.toString();

      // First escalation (Tier 1)
      const esc1 = await escalationService.executeEscalation(caseId, 'Breach 1', 'SYSTEM_SLA_BREACH');
      expect(esc1.sla.escalationHistory.length).toBe(1);

      // Second escalation (Tier 2)
      const esc2 = await escalationService.executeEscalation(caseId, 'Breach 2 - Senior Supervisor', 'SYSTEM_SLA_BREACH');
      expect(esc2.sla.escalationHistory.length).toBe(2);
      expect(esc2.sla.escalationHistory[1].tier).not.toBe(esc1.sla.escalationHistory[0].tier);
    });

    it('sweeps all open cases and escalates any with overdue SLAs', async () => {
      const citizenUser = memoryStore.users.get('66d000000000000000000099')!;
      const created = await caseService.createCase(
        {
          type: 'COMPLAINT',
          title: 'Water Leakage Near School',
          description: 'Heavy water loss on main street',
          category: 'Public Infrastructure',
          priority: 'HIGH',
          organizationId: '66d000000000000000000010',
        },
        citizenUser as any
      );

      // Artificially backdate SLA due dates to simulate breach
      const memCase = memoryStore.cases.get(created._id.toString())!;
      memCase.sla.acknowledgementDueAt = new Date(Date.now() - 3600 * 1000);
      memCase.sla.resolutionDueAt = new Date(Date.now() - 1000);
      memCase.sla.dueAt = new Date(Date.now() - 1000);
      memoryStore.cases.set(created._id.toString(), memCase);

      const sweepResult = await escalationQueueService.runImmediateSweep();
      expect(sweepResult.evaluatedCount).toBeGreaterThan(0);
      expect(sweepResult.escalatedCount).toBeGreaterThanOrEqual(1);
      expect(sweepResult.escalatedCaseIds).toContain(created._id.toString());

      const updatedCase = memoryStore.cases.get(created._id.toString())!;
      expect(updatedCase.status).toBe('ESCALATED');
      expect(updatedCase.sla.isEscalated).toBe(true);
    });
  });
});
