import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { CaseType, CasePriority } from './case.model.js';

export interface ISlaEscalationTier {
  level: number;
  tierName: string;
  triggerAfterBreachMinutes: number;
  assignDepartment?: string;
  escalationReason: string;
}

export interface ISlaBusinessHours {
  enabled: boolean;
  start: string; // e.g. "09:00" (HH:mm)
  end: string;   // e.g. "18:00" (HH:mm)
  timezone: string; // e.g. "Asia/Kolkata"
  workingDays: number[]; // e.g. [1, 2, 3, 4, 5] (Monday=1 to Friday=5)
}

export interface ISlaPolicy extends Document {
  name: string;
  description?: string;
  organizationId?: Types.ObjectId | null; // null for global default policy
  caseType?: CaseType;
  category?: string;
  priority: CasePriority;
  acknowledgementHours: number;
  firstResponseHours: number;
  resolutionHours: number;
  businessHours?: ISlaBusinessHours;
  holidays?: string[]; // Array of "YYYY-MM-DD"
  escalationPolicy: {
    enabled: boolean;
    tiers: ISlaEscalationTier[];
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const slaPolicySchema = new Schema<ISlaPolicy>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    caseType: { type: String, index: true },
    category: { type: String, trim: true, index: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      required: true,
      index: true,
    },
    acknowledgementHours: { type: Number, required: true, default: 4 },
    firstResponseHours: { type: Number, required: true, default: 8 },
    resolutionHours: { type: Number, required: true, default: 48 },
    businessHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    },
    holidays: [{ type: String }],
    escalationPolicy: {
      enabled: { type: Boolean, default: true },
      tiers: [
        {
          level: { type: Number, required: true },
          tierName: { type: String, required: true },
          triggerAfterBreachMinutes: { type: Number, required: true, default: 0 },
          assignDepartment: { type: String },
          escalationReason: { type: String, required: true },
        },
      ],
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

slaPolicySchema.index({ organizationId: 1, caseType: 1, priority: 1, active: 1 });

export const SlaPolicyModel: Model<ISlaPolicy> =
  mongoose.models.SlaPolicy || mongoose.model<ISlaPolicy>('SlaPolicy', slaPolicySchema);
