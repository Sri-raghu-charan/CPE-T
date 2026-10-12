import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'file'
  | 'rating'
  | 'location';

export interface IFormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  order: number;
}

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type FormPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface IForm extends Document {
  organizationId?: Types.ObjectId | null;
  organizationName: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  department?: string;
  isPublic: boolean;
  status: FormStatus;
  slaHours: number;
  priority: FormPriority;
  fields: IFormField[];
  submitButtonText?: string;
  successMessage?: string;
  submissionsCount: number;
  publishedAt?: Date;
  createdById?: Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new Schema<IFormField>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'file', 'rating', 'location'],
    },
    placeholder: { type: String },
    helpText: { type: String },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    defaultValue: { type: Schema.Types.Mixed },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const formSchema = new Schema<IForm>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'PUBLISHED',
      index: true,
    },
    slaHours: {
      type: Number,
      default: 48,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    fields: [formFieldSchema],
    submitButtonText: {
      type: String,
      default: 'Submit Request',
    },
    successMessage: {
      type: String,
      default: 'Thank you. Your request has been recorded and submitted successfully.',
    },
    submissionsCount: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
    },
  },
  { timestamps: true }
);

formSchema.index({ organizationId: 1, status: 1 });
formSchema.index({ isPublic: 1, status: 1 });

export const FormModel: Model<IForm> =
  mongoose.models.Form || mongoose.model<IForm>('Form', formSchema);
