import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'STATUS_UPDATE'
  | 'CASE_ASSIGNED'
  | 'DISPATCH_RESULT'
  | 'SLA_ALERT';

export interface INotification extends Document {
  recipientUserId?: Types.ObjectId;
  recipientOrgId?: Types.ObjectId;
  caseId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    recipientOrgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const NotificationModel: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
