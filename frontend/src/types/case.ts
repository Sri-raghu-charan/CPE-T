export type CaseType =
  | 'SERVICE_REQUEST'
  | 'COMPLAINT'
  | 'GRIEVANCE'
  | 'BLOOD_REQUEST'
  | 'SUPPORT_REQUEST'
  | 'FEEDBACK'
  | (string & {});

export type CaseStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'CONFIRMED'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'WAITING_FOR_ORGANIZATION'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED'
  | 'REOPENED'
  | 'FAILED'
  | 'CANCELLED';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CaseLocation {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CaseAttachment {
  name: string;
  url: string;
  fileType: string;
  size: number;
  uploadedAt?: string;
}

export interface CaseSlaEscalationRecord {
  tier: string;
  escalatedAt: string;
  reason: string;
  assignedDepartment?: string;
  triggeredBy: string;
}

export interface CaseSla {
  dueAt: string;
  slaHours: number;
  acknowledgementDueAt?: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  acknowledgedAt?: string;
  firstRespondedAt?: string;
  status?: 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET';
  breachedMilestones?: ('ACKNOWLEDGEMENT' | 'FIRST_RESPONSE' | 'RESOLUTION')[];
  isEscalated: boolean;
  escalatedAt?: string;
  currentEscalationTier?: string;
  escalationHistory?: CaseSlaEscalationRecord[];
}

export interface CaseResolution {
  summary?: string;
  notes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface CaseFeedback {
  rating: number;
  comments?: string;
  submittedAt: string;
}

export interface CaseReadReceipt {
  userId: string;
  role: string;
  readAt: string;
}

export interface CaseRouting {
  destinationId?: string;
  destinationType: string;
  destinationValue: string;
  department?: string;
  routedAt: string;
  routeMatchedReason?: string;
}

export interface CaseExternalDispatch {
  dispatchId: string;
  channel: string;
  status: string;
  attempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  externalReference?: string;
}

export interface CaseEventItem {
  _id: string;
  caseId: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  eventType: string;
  previousState?: string | null;
  newState?: string | null;
  message: string;
  isInternal: boolean;
  attachments?: CaseAttachment[];
  readBy?: CaseReadReceipt[];
  timestamp: string;
}

export interface CaseItem {
  _id: string;
  referenceNumber: string;
  type: CaseType;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  productService?: string;
  structuredData?: Record<string, any>;
  location?: CaseLocation;
  requesterId: string | { _id: string; name: string; email: string; phone?: string };
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  organizationId: string | { _id: string; name: string; slug: string; type: string };
  organizationName?: string;
  assignedAgentId?: string | { _id: string; name: string; email: string } | null;
  assignedAgentName?: string | null;
  priority: CasePriority;
  status: CaseStatus;
  routing?: CaseRouting;
  externalDispatch?: CaseExternalDispatch;
  attachments: CaseAttachment[];
  sla: CaseSla;
  resolution?: CaseResolution;
  feedback?: CaseFeedback;
  version: number;
  submittedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  timeline?: CaseEventItem[];
  allowedTransitions?: CaseStatus[];
}
