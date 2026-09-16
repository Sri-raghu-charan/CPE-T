import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { auditPlugin } from '../plugins/audit.plugin.js';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type DonorAvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'COOLDOWN';
export type ContactPreference = 'IN_APP' | 'RELAY_SMS' | 'ANONYMOUS_PROXY' | 'PHONE';

export interface IDonorLocation {
  locality?: string;
  municipality?: string; // town / city
  subDistrict?: string; // mandal / taluk
  district?: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface IDonor extends Document {
  userId?: Types.ObjectId;
  anonymousDonorCode: string;
  bloodGroup: BloodGroup;
  availabilityStatus: DonorAvailabilityStatus;
  approximateLocation: IDonorLocation;
  contactPreference: ContactPreference;
  contactPhone: string; // Strictly private - never exposed in public search
  contactEmail?: string; // Strictly private
  lastDonatedAt?: Date;
  isVerified: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const donorSchema = new Schema<IDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    anonymousDonorCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true,
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['AVAILABLE', 'UNAVAILABLE', 'COOLDOWN'],
      default: 'AVAILABLE',
      index: true,
    },
    approximateLocation: {
      locality: { type: String, trim: true, index: true },
      municipality: { type: String, trim: true, index: true },
      subDistrict: { type: String, trim: true, index: true },
      district: { type: String, trim: true, index: true },
      state: { type: String, trim: true, index: true },
      pincode: { type: String, trim: true },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    contactPreference: {
      type: String,
      enum: ['IN_APP', 'RELAY_SMS', 'ANONYMOUS_PROXY', 'PHONE'],
      default: 'IN_APP',
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    lastDonatedAt: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast multi-level discovery
donorSchema.index({ bloodGroup: 1, availabilityStatus: 1 });
donorSchema.index({ 'approximateLocation.district': 1, bloodGroup: 1 });
donorSchema.index({ 'approximateLocation.state': 1, bloodGroup: 1 });

donorSchema.plugin(auditPlugin);

export const DonorModel: Model<IDonor> =
  mongoose.models.Donor || mongoose.model<IDonor>('Donor', donorSchema);
