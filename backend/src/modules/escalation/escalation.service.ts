import { Types } from 'mongoose';
import {
  CaseModel,
  CaseEventModel,
  NotificationModel,
  ISlaEscalationTier,
  CasePriority,
  CaseType,
} from '@cpet/database';
import { memoryStore } from '../../infrastructure/store.js';
import { slaService } from '../sla/sla.service.js';
import { socketManager } from '../../infrastructure/socket.js';
import { logger } from '../../utils/logger.js';

export class EscalationService {
  /**
   * Default multi-tier escalation hierarchy if no organization override exists.
   */
  public getDefaultEscalationTiers(): ISlaEscalationTier[] {
    return [
      {
        level: 1,
        tierName: 'Tier 1: Frontline Operations Desk',
        triggerAfterBreachMinutes: 0,
        assignDepartment: 'General Service Operations',
        escalationReason: 'Initial SLA deadline exceeded; escalated to operational leads.',
      },
      {
        level: 2,
        tierName: 'Tier 2: Senior Engineering & Department Supervisor',
        triggerAfterBreachMinutes: 120,
        assignDepartment: 'Senior Engineering & Grievances',
        escalationReason: 'Extended SLA non-resolution; escalated to department supervisor.',
      },
      {
        level: 3,
        tierName: 'Tier 3: District Ombudsman & Regulatory Officer',
        triggerAfterBreachMinutes: 360,
        assignDepartment: 'District Oversight Cell',
        escalationReason: 'Severe delay beyond local jurisdiction; escalated to District Authority.',
      },
      {
        level: 4,
        tierName: 'Tier 4: State Public Grievance Directorate',
        triggerAfterBreachMinutes: 720,
        assignDepartment: 'State Regulatory Commission',
        escalationReason: 'Critical escalation to State Consumer & Grievance Directorate.',
      },
    ];
  }

  /**
   * Retrieves the active escalation tiers for a specific organization or case.
   */
  public async getTiersForCase(
    organizationId?: string | null,
    caseType?: CaseType,
    priority?: CasePriority
  ): Promise<ISlaEscalationTier[]> {
    const policy = await slaService.getEffectivePolicy({
      organizationId,
      caseType,
      priority: priority || 'MEDIUM',
    });

    if (policy && policy.escalationPolicy?.enabled && policy.escalationPolicy.tiers?.length > 0) {
      return policy.escalationPolicy.tiers;
    }

    return this.getDefaultEscalationTiers();
  }

  /**
   * Automatically executes an escalation tier transition on a case.
   */
  public async executeEscalation(
    caseId: string,
    reason: string = 'Automated SLA breach detected by Escalation Engine',
    triggeredBy: 'SYSTEM_SLA_BREACH' | 'MANUAL_SUPERVISOR' = 'SYSTEM_SLA_BREACH',
    supervisorUser?: { _id: string; name: string; role: any }
  ): Promise<any> {
    const isDb = memoryStore.isDbConnected();
    let targetCase: any;

    if (isDb) {
      targetCase = await CaseModel.findById(caseId);
    } else {
      targetCase = memoryStore.cases.get(caseId);
    }

    if (!targetCase) {
      throw new Error(`Case ${caseId} not found for escalation`);
    }

    // Terminal check
    if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(targetCase.status)) {
      return targetCase;
    }

    const tiers = await this.getTiersForCase(
      targetCase.organizationId?.toString(),
      targetCase.type,
      targetCase.priority
    );

    const currentHistory = targetCase.sla?.escalationHistory || [];
    const currentTierLevel = currentHistory.length; // 0 = not yet escalated, 1 = at Tier 1, etc.
    const nextTier = tiers[currentTierLevel] || tiers[tiers.length - 1];

    const escalationRecord = {
      tier: nextTier.tierName,
      escalatedAt: new Date(),
      reason: `${reason}: ${nextTier.escalationReason}`,
      assignedDepartment: nextTier.assignDepartment || targetCase.routing?.department,
      triggeredBy,
    };

    const previousStatus = targetCase.status;
    const previousDepartment = targetCase.routing?.department;

    if (isDb) {
      targetCase.status = 'ESCALATED';
      targetCase.sla.isEscalated = true;
      targetCase.sla.status = 'BREACHED';
      targetCase.sla.escalatedAt = new Date();
      targetCase.sla.currentEscalationTier = nextTier.tierName;
      if (!targetCase.sla.escalationHistory) targetCase.sla.escalationHistory = [];
      targetCase.sla.escalationHistory.push(escalationRecord);

      if (nextTier.assignDepartment) {
        if (!targetCase.routing) targetCase.routing = {};
        targetCase.routing.department = nextTier.assignDepartment;
      }

      await targetCase.save();

      // Create immutable audit event
      await CaseEventModel.create({
        caseId: new Types.ObjectId(caseId),
        actorId: supervisorUser ? new Types.ObjectId(supervisorUser._id) : null,
        actorName: supervisorUser ? supervisorUser.name : 'CPET Automated Escalation Engine',
        actorRole: supervisorUser ? supervisorUser.role : 'SYSTEM',
        eventType: 'ESCALATED',
        previousState: previousStatus,
        newState: 'ESCALATED',
        message: `Case escalated to ${nextTier.tierName}. Department: ${nextTier.assignDepartment || previousDepartment || 'Unchanged'}. Reason: ${escalationRecord.reason}`,
        isInternal: false,
        metadata: {
          tier: nextTier,
          previousDepartment,
          newDepartment: nextTier.assignDepartment,
          triggeredBy,
        },
        timestamp: new Date(),
      });

      // Notify citizen
      await NotificationModel.create({
        recipientUserId: targetCase.requesterId,
        caseId: targetCase._id,
        type: 'SLA_ALERT',
        title: `Case Escalated: ${targetCase.referenceNumber}`,
        message: `Your request has been escalated to ${nextTier.tierName} for immediate resolution.`,
        isRead: false,
      });
    } else {
      targetCase.status = 'ESCALATED';
      targetCase.sla.isEscalated = true;
      targetCase.sla.status = 'BREACHED';
      targetCase.sla.escalatedAt = new Date();
      targetCase.sla.currentEscalationTier = nextTier.tierName;
      if (!targetCase.sla.escalationHistory) targetCase.sla.escalationHistory = [];
      targetCase.sla.escalationHistory.push(escalationRecord);

      if (nextTier.assignDepartment) {
        if (!targetCase.routing) targetCase.routing = {};
        targetCase.routing.department = nextTier.assignDepartment;
      }

      memoryStore.cases.set(caseId, targetCase);

      const existingEvents = memoryStore.caseEvents.get(caseId) || [];
      existingEvents.push({
        _id: 'evt-esc-' + Date.now(),
        caseId,
        actorId: supervisorUser ? supervisorUser._id : null,
        actorName: supervisorUser ? supervisorUser.name : 'CPET Automated Escalation Engine',
        actorRole: supervisorUser ? supervisorUser.role : 'SYSTEM',
        eventType: 'ESCALATED',
        previousState: previousStatus,
        newState: 'ESCALATED',
        message: `Case escalated to ${nextTier.tierName}. Department: ${nextTier.assignDepartment || previousDepartment || 'Unchanged'}. Reason: ${escalationRecord.reason}`,
        isInternal: false,
        metadata: {
          tier: nextTier,
          previousDepartment,
          newDepartment: nextTier.assignDepartment,
          triggeredBy,
        },
        timestamp: new Date(),
      });
      memoryStore.caseEvents.set(caseId, existingEvents);

      memoryStore.notifications.set('notif-esc-' + Date.now(), {
        _id: 'notif-esc-' + Date.now(),
        recipientUserId: targetCase.requesterId,
        caseId: targetCase._id,
        type: 'SLA_ALERT',
        title: `Case Escalated: ${targetCase.referenceNumber}`,
        message: `Your request has been escalated to ${nextTier.tierName} for immediate resolution.`,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Broadcast real-time Socket.IO events
    socketManager.emitToCase(caseId, 'case:escalated', {
      caseId,
      referenceNumber: targetCase.referenceNumber,
      tier: nextTier.tierName,
      department: targetCase.routing?.department,
      status: 'ESCALATED',
      reason: escalationRecord.reason,
    });

    socketManager.emitToCase(caseId, 'case:sla_update', {
      caseId,
      slaStatus: 'BREACHED',
      isEscalated: true,
      currentTier: nextTier.tierName,
    });

    logger.info(`[EscalationEngine] Case ${targetCase.referenceNumber} escalated to ${nextTier.tierName}`);
    return targetCase;
  }

  /**
   * Sweeps all active cases and executes automated escalation for any breached cases.
   */
  public async sweepAndEscalateBreachedCases(): Promise<{
    evaluatedCount: number;
    escalatedCount: number;
    escalatedCaseIds: string[];
  }> {
    const isDb = memoryStore.isDbConnected();
    const openStatuses = [
      'SUBMITTED',
      'ACKNOWLEDGED',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING_FOR_USER',
      'WAITING_FOR_ORGANIZATION',
      'REOPENED',
    ];

    let openCases: any[] = [];
    if (isDb) {
      openCases = await CaseModel.find({
        status: { $in: openStatuses },
      }).lean();
    } else {
      openCases = Array.from(memoryStore.cases.values()).filter((c) =>
        openStatuses.includes(c.status)
      );
    }

    const now = new Date();
    let escalatedCount = 0;
    const escalatedCaseIds: string[] = [];

    for (const c of openCases) {
      const evalResult = slaService.evaluateCaseSla(c, now);

      if (evalResult.isBreached && !c.sla?.isEscalated) {
        try {
          await this.executeEscalation(
            c._id.toString(),
            `Breached SLA milestones: ${evalResult.breachedMilestones.join(', ')}`,
            'SYSTEM_SLA_BREACH'
          );
          escalatedCount++;
          escalatedCaseIds.push(c._id.toString());
        } catch (err: any) {
          logger.error(`[EscalationEngine] Failed to auto-escalate case ${c._id}: ${err.message}`);
        }
      }
    }

    return {
      evaluatedCount: openCases.length,
      escalatedCount,
      escalatedCaseIds,
    };
  }
}

export const escalationService = new EscalationService();
