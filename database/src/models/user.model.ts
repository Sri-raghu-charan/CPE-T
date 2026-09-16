import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { auditPlugin } from '../plugins/audit.plugin.js';

export type UserRole =
  | 'CITIZEN'
  | 'DONOR'
  | 'ORGANIZATION_ADMIN'
  | 'ORGANIZATION_AGENT'
  | 'CPET_ADMIN'
  | 'CPET_SUPPORT'
  | 'SUPER_ADMIN';

export interface IUserConsent {
  termsAccepted: boolean;
  termsVersion: string;
  acceptedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  organizationId?: Types.ObjectId;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  consent: IUserConsent;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never return password hash in regular queries
    },
    role: {
      type: String,
      enum: [
        'CITIZEN',
        'DONOR',
        'ORGANIZATION_ADMIN',
        'ORGANIZATION_AGENT',
        'CPET_ADMIN',
        'CPET_SUPPORT',
        'SUPER_ADMIN',
      ],
      default: 'CITIZEN',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    consent: {
      termsAccepted: { type: Boolean, default: false },
      termsVersion: { type: String, default: '1.0' },
      acceptedAt: { type: Date, default: Date.now },
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.plugin(auditPlugin);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
