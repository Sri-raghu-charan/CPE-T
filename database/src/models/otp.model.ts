import mongoose, { Schema, Document, Model } from 'mongoose';

export type OtpPurpose =
  | 'SIGNUP'
  | 'LOGIN'
  | 'PASSWORD_RESET'
  | 'PHONE_VERIFICATION'
  | 'EMAIL_VERIFICATION';

export interface IOtp extends Document {
  target: string;
  destinationHash?: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  isVerified: boolean;
  lastSentAt: Date;
  verifiedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    target: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    destinationHash: {
      type: String,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['SIGNUP', 'LOGIN', 'PASSWORD_RESET', 'PHONE_VERIFICATION', 'EMAIL_VERIFICATION'],
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

otpSchema.index({ target: 1, purpose: 1, isVerified: 1, createdAt: -1 });
otpSchema.index({ target: 1, createdAt: -1 });

export const OtpModel: Model<IOtp> =
  mongoose.models.Otp || mongoose.model<IOtp>('Otp', otpSchema);
