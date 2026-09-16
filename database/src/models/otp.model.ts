import mongoose, { Schema, Document, Model } from 'mongoose';

export type OtpPurpose = 'SIGNUP' | 'LOGIN' | 'PASSWORD_RESET' | 'PHONE_VERIFICATION';

export interface IOtp extends Document {
  target: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  isVerified: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    target: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['SIGNUP', 'LOGIN', 'PASSWORD_RESET', 'PHONE_VERIFICATION'],
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const OtpModel: Model<IOtp> =
  mongoose.models.Otp || mongoose.model<IOtp>('Otp', otpSchema);
