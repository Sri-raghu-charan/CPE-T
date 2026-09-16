import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { UserRole } from './user.model.js';

export type CaseEventType =
  | 'CASE_CREATED'
  | 'STATUS_CHANGE'
  | 'AGENT_ASSIGNED'
  | 'MESSAGE'
  | 'INFO_REQUESTED'
  | 'INFO_PROVIDED'
  | 'SLA_WARNING'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'CLOSED'
  | 'ATTACHMENT_ADDED'
  | 'EXTERNAL_DISPATCH_QUEUED'
  | 'EXTERNAL_DISPATCH_SUCCESS'
  | 'EXTERNAL_DISPATCH_FAILED';

export interface ICaseEventAttachment {
  name: string;
  url: string;
  fileType: string;
  size: number;
}

export interface ICaseEventReadReceipt {
  userId: Types.ObjectId | string;
  role: string;
  readAt: Date;
}

export interface ICaseEvent extends Document {
  caseId: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  actorName: string;
  actorRole: UserRole | 'SYSTEM';
  eventType: CaseEventType;
  previousState?: string | null;
  newState?: string | null;
  message: string;
  isInternal: boolean;
  attachments?: ICaseEventAttachment[];
  readBy: ICaseEventReadReceipt[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

const caseEventSchema = new Schema<ICaseEvent>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    previousState: {
      type: String,
      default: null,
    },
    newState: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true, // Audit event timestamps cannot be altered once created
      index: true,
    },
  },
  {
    timestamps: false, // We use immutable timestamp field
  }
);

// Timeline chronological lookup index
caseEventSchema.index({ caseId: 1, timestamp: 1 });
caseEventSchema.index({ caseId: 1, isInternal: 1, timestamp: 1 });

export const CaseEventModel: Model<ICaseEvent> =
  mongoose.models.CaseEvent || mongoose.model<ICaseEvent>('CaseEvent', caseEventSchema);
