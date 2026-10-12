import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFormSubmission extends Document {
  formId: Types.ObjectId;
  caseId?: Types.ObjectId;
  referenceNumber: string;
  answers: Record<string, any>;
  citizenInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  location?: {
    coordinates?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  submittedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const formSubmissionSchema = new Schema<IFormSubmission>(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    referenceNumber: {
      type: String,
      required: true,
      index: true,
    },
    answers: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    citizenInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
        size: { type: Number },
      },
    ],
    location: {
      coordinates: [{ type: Number }],
      address: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const FormSubmissionModel: Model<IFormSubmission> =
  mongoose.models.FormSubmission || mongoose.model<IFormSubmission>('FormSubmission', formSubmissionSchema);
