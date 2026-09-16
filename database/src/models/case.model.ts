import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { auditPlugin } from '../plugins/audit.plugin.js';

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

export interface ICaseLocation {
  address?: string;
  locality?: string;
  city?: string;
  municipality?: string;
  subDistrict?: string; // mandal / sub-district
  district?: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface ICaseAttachment {
  name: string;
  url: string;
  fileType: string;
  size: number;
  uploadedAt: Date;
  uploaderId?: Types.ObjectId;
}

export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED' | 'MET';

export interface ICaseSlaEscalationRecord {
  tier: string;
  escalatedAt: Date;
  reason: string;
  assignedDepartment?: string;
  triggeredBy: 'SYSTEM_SLA_BREACH' | 'MANUAL_SUPERVISOR';
}

export interface ICaseSla {
  dueAt: Date;
  slaHours: number;
  acknowledgementDueAt?: Date;
  firstResponseDueAt?: Date;
  resolutionDueAt?: Date;
  acknowledgedAt?: Date;
  firstRespondedAt?: Date;
  status?: SlaStatus;
  breachedMilestones?: ('ACKNOWLEDGEMENT' | 'FIRST_RESPONSE' | 'RESOLUTION')[];
  isEscalated: boolean;
  escalatedAt?: Date;
  currentEscalationTier?: string;
  escalationHistory?: ICaseSlaEscalationRecord[];
}

export interface ICaseResolution {
  summary?: string;
  notes?: string;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
}

export interface ICaseFeedback {
  rating: number; // 1 to 5 stars
  comments?: string;
  submittedAt: Date;
}

export interface ICaseRouting {
  destinationId?: Types.ObjectId;
  destinationType?: string;
  destinationValue?: string;
  department?: string;
  routedAt?: Date;
  routeMatchedReason?: string;
}

export interface ICaseExternalDispatch {
  dispatchId: string;
  channel: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  externalReference?: string;
  lastAttemptAt?: Date;
  attempts: number;
  error?: string;
}

export interface ICase extends Document {
  referenceNumber: string;
  type: CaseType;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  productService?: string;
  structuredData?: Record<string, any>;
  location?: ICaseLocation;
  requesterId: Types.ObjectId;
  organizationId: Types.ObjectId;
  assignedAgentId?: Types.ObjectId | null;
  priority: CasePriority;
  status: CaseStatus;
  routing?: ICaseRouting;
  externalDispatch?: ICaseExternalDispatch;
  attachments: ICaseAttachment[];
  sla: ICaseSla;
  resolution?: ICaseResolution;
  feedback?: ICaseFeedback;
  version: number;
  submittedAt?: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const caseSchema = new Schema<ICase>(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    productService: {
      type: String,
      trim: true,
    },
    structuredData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    location: {
      address: { type: String, trim: true },
      locality: { type: String, trim: true, index: true },
      city: { type: String, trim: true, index: true },
      municipality: { type: String, trim: true, index: true },
      subDistrict: { type: String, trim: true, index: true },
      district: { type: String, trim: true, index: true },
      state: { type: String, trim: true, index: true },
      pincode: { type: String, trim: true },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'READY_FOR_REVIEW',
        'CONFIRMED',
        'SUBMITTED',
        'ACKNOWLEDGED',
        'ASSIGNED',
        'IN_PROGRESS',
        'WAITING_FOR_USER',
        'WAITING_FOR_ORGANIZATION',
        'RESOLVED',
        'CLOSED',
        'ESCALATED',
        'REOPENED',
        'FAILED',
        'CANCELLED',
      ],
      default: 'SUBMITTED',
      index: true,
    },
    routing: {
      destinationId: { type: Schema.Types.ObjectId, ref: 'Destination', index: true },
      destinationType: { type: String },
      destinationValue: { type: String },
      department: { type: String },
      routedAt: { type: Date },
      routeMatchedReason: { type: String },
    },
    externalDispatch: {
      dispatchId: { type: String, index: true },
      channel: { type: String },
      status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
      externalReference: { type: String },
      lastAttemptAt: { type: Date },
      attempts: { type: Number, default: 0 },
      error: { type: String },
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploaderId: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    sla: {
      dueAt: { type: Date, required: true, index: true },
      slaHours: { type: Number, default: 48 },
      acknowledgementDueAt: { type: Date },
      firstResponseDueAt: { type: Date },
      resolutionDueAt: { type: Date },
      acknowledgedAt: { type: Date },
      firstRespondedAt: { type: Date },
      status: {
        type: String,
        enum: ['ON_TRACK', 'AT_RISK', 'BREACHED', 'MET'],
        default: 'ON_TRACK',
        index: true,
      },
      breachedMilestones: [{ type: String, enum: ['ACKNOWLEDGEMENT', 'FIRST_RESPONSE', 'RESOLUTION'] }],
      isEscalated: { type: Boolean, default: false, index: true },
      escalatedAt: { type: Date },
      currentEscalationTier: { type: String },
      escalationHistory: [
        {
          tier: { type: String, required: true },
          escalatedAt: { type: Date, default: Date.now },
          reason: { type: String, required: true },
          assignedDepartment: { type: String },
          triggeredBy: {
            type: String,
            enum: ['SYSTEM_SLA_BREACH', 'MANUAL_SUPERVISOR'],
            default: 'SYSTEM_SLA_BREACH',
          },
        },
      ],
    },
    resolution: {
      summary: { type: String },
      notes: { type: String },
      resolvedAt: { type: Date },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: { type: String },
      submittedAt: { type: Date },
    },
    version: {
      type: Number,
      default: 1,
    },
    submittedAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for fast citizen & organization queue queries & SLA monitoring
caseSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
caseSchema.index({ organizationId: 1, status: 1, priority: 1, createdAt: -1 });
caseSchema.index({ organizationId: 1, assignedAgentId: 1 });
caseSchema.index({ 'sla.status': 1, 'sla.dueAt': 1, status: 1 });

caseSchema.plugin(auditPlugin);

export const CaseModel: Model<ICase> =
  mongoose.models.Case || mongoose.model<ICase>('Case', caseSchema);
