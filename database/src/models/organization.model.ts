import mongoose, { Schema, Document, Model } from 'mongoose';
import { auditPlugin } from '../plugins/audit.plugin.js';

export type OrganizationType =
  | 'MUNICIPAL'
  | 'UTILITY'
  | 'HEALTHCARE'
  | 'CONSUMER_GOODS'
  | 'TRANSPORT'
  | 'GOVERNMENT'
  | 'OTHER';

export type OrganizationStatus = 'PENDING' | 'VERIFIED' | 'SUSPENDED';

export interface IDepartment {
  id: string;
  name: string;
  code: string;
  active: boolean;
  contactEmail?: string;
}

export interface IOrgLocation {
  city: string;
  state?: string;
  pincodes?: string[];
  address?: string;
  isHeadquarters?: boolean;
}

export interface IContactChannel {
  type: 'EMAIL' | 'PHONE' | 'WEB' | 'DESK';
  value: string;
  isPrimary: boolean;
  notes?: string;
}

export interface IOrganizationSettings {
  autoAssign: boolean;
  defaultSlaHours: number;
}

export interface IOrganization extends Document {
  name: string;
  slug: string;
  brandName?: string;
  aliases: string[];
  type: OrganizationType;
  category: string;
  departments: IDepartment[];
  services: string[];
  products: string[];
  serviceCategories: string[];
  locations: IOrgLocation[];
  jurisdictions: string[];
  contactChannels: IContactChannel[];
  status: OrganizationStatus;
  active: boolean;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  settings: IOrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
      index: true,
    },
    type: {
      type: String,
      enum: ['MUNICIPAL', 'UTILITY', 'HEALTHCARE', 'CONSUMER_GOODS', 'TRANSPORT', 'GOVERNMENT', 'OTHER'],
      default: 'OTHER',
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    departments: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        code: { type: String, required: true },
        active: { type: Boolean, default: true },
        contactEmail: { type: String, trim: true },
      },
    ],
    services: {
      type: [String],
      default: [],
      index: true,
    },
    products: {
      type: [String],
      default: [],
      index: true,
    },
    serviceCategories: {
      type: [String],
      default: [],
    },
    locations: [
      {
        city: { type: String, required: true },
        state: { type: String },
        pincodes: { type: [String], default: [] },
        address: { type: String },
        isHeadquarters: { type: Boolean, default: false },
      },
    ],
    jurisdictions: {
      type: [String],
      default: [],
    },
    contactChannels: [
      {
        type: { type: String, enum: ['EMAIL', 'PHONE', 'WEB', 'DESK'], required: true },
        value: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'SUSPENDED'],
      default: 'VERIFIED',
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    settings: {
      autoAssign: { type: Boolean, default: false },
      defaultSlaHours: { type: Number, default: 48 },
    },
  },
  { timestamps: true }
);

organizationSchema.plugin(auditPlugin);

export const OrganizationModel: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', organizationSchema);
