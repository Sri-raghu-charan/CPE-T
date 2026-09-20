import { Types } from 'mongoose';
import {
  CaseType,
  CasePriority,
  SlaPolicyModel,
  ISlaPolicy,
  ICaseSla,
  SlaStatus,
} from '@cpet/database';
import { memoryStore } from '../../infrastructure/store.js';
import { domainService } from '../domains/domain.service.js';

export interface SlaCalculationResult {
  benchmarkHours: number;
  acknowledgementDueAt: Date;
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  status: SlaStatus;
  isEscalated: boolean;
  businessHoursEnabled: boolean;
}

export interface SlaEvaluationResult {
  status: SlaStatus;
  isBreached: boolean;
  breachedMilestones: ('ACKNOWLEDGEMENT' | 'FIRST_RESPONSE' | 'RESOLUTION')[];
  timeRemainingHours: number;
  timeRemainingMinutes: number;
  isEscalationRequired: boolean;
}

export class SlaService {
  /**
   * Resolves the matching SLA policy for a case.
   * Priority: Org + CaseType + Priority -> CaseType + Priority -> Global Default
   */
  public async getEffectivePolicy(params: {
    organizationId?: string | null;
    caseType?: CaseType;
    category?: string;
    priority: CasePriority;
  }): Promise<ISlaPolicy | any> {
    const isDb = memoryStore.isDbConnected();

    if (isDb) {
      // 1. Check organization specific policy
      if (params.organizationId && Types.ObjectId.isValid(params.organizationId)) {
        const orgPolicy = await SlaPolicyModel.findOne({
          organizationId: new Types.ObjectId(params.organizationId),
          $or: [{ caseType: params.caseType }, { caseType: null }],
          priority: params.priority,
          active: true,
        }).lean();
        if (orgPolicy) return orgPolicy;
      }

      // 2. Check caseType default policy
      if (params.caseType) {
        const typePolicy = await SlaPolicyModel.findOne({
          organizationId: null,
          caseType: params.caseType,
          priority: params.priority,
          active: true,
        }).lean();
        if (typePolicy) return typePolicy;
      }

      // 3. Fallback to global active policy
      const globalPolicy = await SlaPolicyModel.findOne({
        organizationId: null,
        caseType: null,
        priority: params.priority,
        active: true,
      }).lean();
      if (globalPolicy) return globalPolicy;
    } else {
      // Memory store fallback
      for (const policy of memoryStore.slaPolicies.values()) {
        if (!policy.active) continue;
        if (
          params.organizationId &&
          policy.organizationId === params.organizationId &&
          (!policy.caseType || policy.caseType === params.caseType) &&
          policy.priority === params.priority
        ) {
          return policy;
        }
      }

      for (const policy of memoryStore.slaPolicies.values()) {
        if (!policy.active) continue;
        if (
          !policy.organizationId &&
          policy.caseType === params.caseType &&
          policy.priority === params.priority
        ) {
          return policy;
        }
      }

      for (const policy of memoryStore.slaPolicies.values()) {
        if (!policy.active) continue;
        if (!policy.organizationId && !policy.caseType && policy.priority === params.priority) {
          return policy;
        }
      }
    }

    return null;
  }

  /**
   * Adds business hours to a starting date, skipping non-working hours, weekends, and holidays.
   */
  public addBusinessHours(
    startDate: Date,
    hoursToAdd: number,
    config: {
      startHour: number; // e.g. 9
      endHour: number;   // e.g. 18
      workingDays: number[]; // [1, 2, 3, 4, 5] (1=Mon, 5=Fri)
      holidays?: string[]; // "YYYY-MM-DD"
    }
  ): Date {
    const holidaysSet = new Set(config.holidays || []);
    let current = new Date(startDate.getTime());
    let minutesLeft = Math.round(hoursToAdd * 60);

    const isWorkingDay = (d: Date) => {
      const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
      const isoDate = d.toISOString().slice(0, 10);
      return config.workingDays.includes(dayOfWeek) && !holidaysSet.has(isoDate);
    };

    // Forward to next valid working window if starting outside
    while (!isWorkingDay(current) || current.getHours() >= config.endHour) {
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, 0, 0, 0);
    }
    if (current.getHours() < config.startHour) {
      current.setHours(config.startHour, 0, 0, 0);
    }

    while (minutesLeft > 0) {
      if (!isWorkingDay(current)) {
        current.setDate(current.getDate() + 1);
        current.setHours(config.startHour, 0, 0, 0);
        continue;
      }

      const currentHour = current.getHours();
      const currentMinute = current.getMinutes();

      if (currentHour >= config.endHour) {
        current.setDate(current.getDate() + 1);
        current.setHours(config.startHour, 0, 0, 0);
        continue;
      }

      // Minutes remaining in today's business window
      const minutesRemainingToday = (config.endHour - currentHour) * 60 - currentMinute;

      if (minutesLeft <= minutesRemainingToday) {
        current = new Date(current.getTime() + minutesLeft * 60 * 1000);
        minutesLeft = 0;
      } else {
        minutesLeft -= minutesRemainingToday;
        current.setDate(current.getDate() + 1);
        current.setHours(config.startHour, 0, 0, 0);
      }
    }

    return current;
  }

  /**
   * Calculates comprehensive multi-milestone SLA due dates for a case.
   */
  public async calculateSla(params: {
    caseType: CaseType;
    priority: CasePriority;
    organizationId?: string | null;
    category?: string;
    orgDefaultSlaHours?: number;
    createdAt?: Date;
  }): Promise<SlaCalculationResult> {
    const startTime = params.createdAt || new Date();
    const policy = await this.getEffectivePolicy(params);

    let ackHours = 4;
    let respHours = 8;
    let resHours = params.orgDefaultSlaHours || 48;
    let businessHoursEnabled = false;

    if (policy) {
      ackHours = policy.acknowledgementHours;
      respHours = policy.firstResponseHours;
      resHours = policy.resolutionHours;
      businessHoursEnabled = !!policy.businessHours?.enabled;
    } else {
      // Fallback domain-specific calculation
      if (params.caseType === 'BLOOD_REQUEST') {
        ackHours = 0.5;
        respHours = 1;
        resHours = 6;
      } else {
        const domainHours = domainService.calculateDomainSlaHours(
          params.caseType,
          params.priority,
          params.orgDefaultSlaHours || 48
        );
        resHours = domainHours;
        switch (params.priority) {
          case 'URGENT':
            ackHours = 1;
            respHours = 2;
            break;
          case 'HIGH':
            ackHours = 2;
            respHours = 4;
            break;
          case 'MEDIUM':
            ackHours = 4;
            respHours = 8;
            break;
          case 'LOW':
            ackHours = 8;
            respHours = 16;
            break;
        }
      }
    }

    // Emergency blood requests ALWAYS bypass business hours (24x7 immediate response)
    if (params.caseType === 'BLOOD_REQUEST') {
      businessHoursEnabled = false;
    }

    let acknowledgementDueAt: Date;
    let firstResponseDueAt: Date;
    let resolutionDueAt: Date;

    if (businessHoursEnabled && policy?.businessHours) {
      const bh = policy.businessHours;
      const startHour = parseInt(bh.start.split(':')[0], 10) || 9;
      const endHour = parseInt(bh.end.split(':')[0], 10) || 18;
      const workingDays = bh.workingDays || [1, 2, 3, 4, 5];
      const holidays = policy.holidays || [];

      acknowledgementDueAt = this.addBusinessHours(startTime, ackHours, { startHour, endHour, workingDays, holidays });
      firstResponseDueAt = this.addBusinessHours(startTime, respHours, { startHour, endHour, workingDays, holidays });
      resolutionDueAt = this.addBusinessHours(startTime, resHours, { startHour, endHour, workingDays, holidays });
    } else {
      acknowledgementDueAt = new Date(startTime.getTime() + ackHours * 3600 * 1000);
      firstResponseDueAt = new Date(startTime.getTime() + respHours * 3600 * 1000);
      resolutionDueAt = new Date(startTime.getTime() + resHours * 3600 * 1000);
    }

    return {
      benchmarkHours: resHours,
      acknowledgementDueAt,
      firstResponseDueAt,
      resolutionDueAt,
      status: 'ON_TRACK',
      isEscalated: false,
      businessHoursEnabled,
    };
  }

  /**
   * Evaluates the active SLA status of a case at a given point in time.
   */
  public evaluateCaseSla(caseItem: any, currentTime: Date = new Date()): SlaEvaluationResult {
    const sla: ICaseSla = caseItem.sla || {};
    const breachedMilestones: ('ACKNOWLEDGEMENT' | 'FIRST_RESPONSE' | 'RESOLUTION')[] = [];

    const now = currentTime.getTime();
    const resolutionDue = sla.resolutionDueAt ? new Date(sla.resolutionDueAt).getTime() : new Date(sla.dueAt).getTime();
    const ackDue = sla.acknowledgementDueAt ? new Date(sla.acknowledgementDueAt).getTime() : null;
    const respDue = sla.firstResponseDueAt ? new Date(sla.firstResponseDueAt).getTime() : null;

    // Terminal statuses
    if (caseItem.status === 'RESOLVED' || caseItem.status === 'CLOSED') {
      const resolvedTime = caseItem.resolvedAt ? new Date(caseItem.resolvedAt).getTime() : now;
      const wasMet = resolvedTime <= resolutionDue;
      return {
        status: wasMet ? 'MET' : 'BREACHED',
        isBreached: !wasMet,
        breachedMilestones: wasMet ? [] : ['RESOLUTION'],
        timeRemainingHours: 0,
        timeRemainingMinutes: 0,
        isEscalationRequired: false,
      };
    }

    if (caseItem.status === 'CANCELLED') {
      return {
        status: 'MET',
        isBreached: false,
        breachedMilestones: [],
        timeRemainingHours: 0,
        timeRemainingMinutes: 0,
        isEscalationRequired: false,
      };
    }

    // 1. Acknowledgement SLA check
    if (ackDue && !sla.acknowledgedAt && caseItem.status === 'SUBMITTED' && now > ackDue) {
      breachedMilestones.push('ACKNOWLEDGEMENT');
    }

    // 2. First Response SLA check
    if (respDue && !sla.firstRespondedAt && now > respDue) {
      breachedMilestones.push('FIRST_RESPONSE');
    }

    // 3. Resolution SLA check
    if (now > resolutionDue) {
      breachedMilestones.push('RESOLUTION');
    }

    const isBreached = breachedMilestones.length > 0;
    const diffMs = resolutionDue - now;
    const timeRemainingHours = Math.round(diffMs / (1000 * 3600));
    const timeRemainingMinutes = Math.round(diffMs / (1000 * 60));

    let status: SlaStatus = 'ON_TRACK';
    if (isBreached) {
      status = 'BREACHED';
    } else if (diffMs > 0 && diffMs < (sla.slaHours || 48) * 3600 * 1000 * 0.2) {
      // Less than 20% time remaining
      status = 'AT_RISK';
    }

    return {
      status,
      isBreached,
      breachedMilestones,
      timeRemainingHours,
      timeRemainingMinutes,
      isEscalationRequired: isBreached && !sla.isEscalated,
    };
  }
}

export const slaService = new SlaService();
