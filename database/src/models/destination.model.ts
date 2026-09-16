import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { auditPlugin } from '../plugins/audit.plugin.js';

export type DestinationType =
  | 'EMAIL'
  | 'API'
  | 'WEBHOOK'
  | 'INTERNAL_QUEUE'
  | 'OFFICIAL_PORTAL';

export type DestinationVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface IDestination extends Document {
  organizationId: Types.ObjectId;
  departmentId?: string;
  serviceCategory?: string;
  type: DestinationType;
  value: string;
  credentials?: Record<string, any>;
  source: string;
  verificationStatus: DestinationVerificationStatus;
  verifiedDate?: Date;
  activeStatus: boolean;
  reviewDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const destinationSchema = new Schema<IDestination>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    departmentId: {
      type: String,
      trim: true,
      index: true,
    },
    serviceCategory: {
      type: String,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['EMAIL', 'API', 'WEBHOOK', 'INTERNAL_QUEUE', 'OFFICIAL_PORTAL'],
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    credentials: {
      type: Schema.Types.Mixed,
      default: {},
    },
    source: {
      type: String,
      default: 'OFFICIAL_REGISTRY',
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'VERIFIED',
      index: true,
    },
    verifiedDate: {
      type: Date,
      default: Date.now,
    },
    activeStatus: {
      type: Boolean,
      default: true,
      index: true,
    },
    reviewDate: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

destinationSchema.plugin(auditPlugin);

export const DestinationModel: Model<IDestination> =
  mongoose.models.Destination || mongoose.model<IDestination>('Destination', destinationSchema);
