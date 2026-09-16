import { CaseStatus, UserRole } from '@cpet/database';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';

export interface TransitionRule {
  target: CaseStatus;
  allowedRoles: (UserRole | 'SYSTEM')[];
  description: string;
}

export const STATE_TRANSITIONS: Record<CaseStatus, TransitionRule[]> = {
  DRAFT: [
    {
      target: 'READY_FOR_REVIEW',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen prepares request for review',
    },
    {
      target: 'SUBMITTED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Directly dispatch case to organization',
    },
    {
      target: 'CANCELLED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen discards draft',
    },
  ],
  READY_FOR_REVIEW: [
    {
      target: 'CONFIRMED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen verifies request accuracy',
    },
    {
      target: 'SUBMITTED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen transmits confirmed request',
    },
    {
      target: 'CANCELLED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen cancels request',
    },
  ],
  CONFIRMED: [
    {
      target: 'SUBMITTED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Formal submission into organization inbox',
    },
    {
      target: 'CANCELLED',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen cancels request before dispatch',
    },
  ],
  SUBMITTED: [
    {
      target: 'ACKNOWLEDGED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN', 'SYSTEM'],
      description: 'Organization officially acknowledges receipt of case',
    },
    {
      target: 'ASSIGNED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Case directly assigned to internal handler',
    },
    {
      target: 'CANCELLED',
      allowedRoles: ['CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Citizen withdraws pending submission',
    },
  ],
  ACKNOWLEDGED: [
    {
      target: 'ASSIGNED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Assign case to designated agent',
    },
    {
      target: 'IN_PROGRESS',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Begin active investigation or servicing',
    },
    {
      target: 'WAITING_FOR_USER',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Request further clarification or evidence from citizen',
    },
    {
      target: 'CANCELLED',
      allowedRoles: ['CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Citizen withdraws acknowledged request',
    },
  ],
  ASSIGNED: [
    {
      target: 'IN_PROGRESS',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Assigned agent begins work',
    },
    {
      target: 'ASSIGNED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Reassign case to another agent',
    },
    {
      target: 'WAITING_FOR_USER',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Agent requests details from citizen',
    },
  ],
  IN_PROGRESS: [
    {
      target: 'WAITING_FOR_USER',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Require citizen response or additional documents',
    },
    {
      target: 'WAITING_FOR_ORGANIZATION',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen supplied requested details, awaiting organization action',
    },
    {
      target: 'RESOLVED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Mark request or grievance as resolved with resolution notes',
    },
    {
      target: 'ESCALATED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN', 'SYSTEM'],
      description: 'Escalate case due to SLA breach or severe priority',
    },
    {
      target: 'FAILED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Mark case unresolvable with official justification',
    },
  ],
  WAITING_FOR_USER: [
    {
      target: 'WAITING_FOR_ORGANIZATION',
      allowedRoles: ['CITIZEN', 'DONOR', 'SUPER_ADMIN'],
      description: 'Citizen submitted response to inquiry',
    },
    {
      target: 'IN_PROGRESS',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Resume work without further citizen data',
    },
    {
      target: 'RESOLVED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Conclude and mark resolved',
    },
  ],
  WAITING_FOR_ORGANIZATION: [
    {
      target: 'IN_PROGRESS',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Organization resumes work after citizen reply',
    },
    {
      target: 'WAITING_FOR_USER',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Organization requests further info',
    },
    {
      target: 'RESOLVED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Complete and mark resolved',
    },
    {
      target: 'ESCALATED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN', 'SYSTEM'],
      description: 'Escalate case',
    },
  ],
  ESCALATED: [
    {
      target: 'ASSIGNED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Reassign escalated case to senior tier handler',
    },
    {
      target: 'IN_PROGRESS',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Senior tier begins investigation',
    },
    {
      target: 'RESOLVED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Senior tier resolves case',
    },
  ],
  RESOLVED: [
    {
      target: 'CLOSED',
      allowedRoles: ['CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN', 'SYSTEM'],
      description: 'Citizen confirms successful resolution or auto-closure window expires',
    },
    {
      target: 'REOPENED',
      allowedRoles: ['CITIZEN', 'DONOR', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Citizen disputes resolution within allowed window',
    },
  ],
  REOPENED: [
    {
      target: 'IN_PROGRESS',
      allowedRoles: ['ORGANIZATION_ADMIN', 'ORGANIZATION_AGENT', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Reopen inquiry and investigate citizen dispute',
    },
    {
      target: 'ASSIGNED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Reassign reopened case',
    },
    {
      target: 'ESCALATED',
      allowedRoles: ['ORGANIZATION_ADMIN', 'CPET_ADMIN', 'SUPER_ADMIN'],
      description: 'Escalate disputed case',
    },
  ],
  CLOSED: [],
  CANCELLED: [],
  FAILED: [],
};

/**
 * Returns an array of valid next statuses for a given current status and actor role.
 */
export function getAllowedTransitions(
  currentStatus: CaseStatus,
  role: UserRole | 'SYSTEM'
): CaseStatus[] {
  const rules = STATE_TRANSITIONS[currentStatus] || [];
  return rules
    .filter((rule) => rule.allowedRoles.includes(role))
    .map((rule) => rule.target);
}

/**
 * Checks whether a specific transition is permissible.
 */
export function canTransition(
  currentStatus: CaseStatus,
  targetStatus: CaseStatus,
  role: UserRole | 'SYSTEM'
): boolean {
  const rules = STATE_TRANSITIONS[currentStatus] || [];
  const rule = rules.find((r) => r.target === targetStatus);
  if (!rule) return false;
  return rule.allowedRoles.includes(role);
}

/**
 * Validates transition or throws structured operational error.
 */
export function assertValidTransition(
  currentStatus: CaseStatus,
  targetStatus: CaseStatus,
  role: UserRole | 'SYSTEM'
): void {
  const rules = STATE_TRANSITIONS[currentStatus];
  if (!rules || rules.length === 0) {
    throw new ValidationError(
      `Case is in terminal state '${currentStatus}'. No further transitions are permitted.`
    );
  }

  const rule = rules.find((r) => r.target === targetStatus);
  if (!rule) {
    const validTargets = rules.map((r) => `'${r.target}'`).join(', ');
    throw new ValidationError(
      `Invalid state transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Permitted transitions: [${validTargets}]`
    );
  }

  if (!rule.allowedRoles.includes(role)) {
    throw new ForbiddenError(
      `Forbidden: Role '${role}' is not authorized to transition case from '${currentStatus}' to '${targetStatus}'.`
    );
  }
}
