import { Schema } from 'mongoose';

export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export function auditPlugin(schema: Schema): void {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
    },
    updatedBy: {
      type: String,
      default: null,
    },
  });

  schema.set('timestamps', true);

  schema.pre(/^find/, function (this: any, next) {
    if (this.getFilter().includeDeleted !== true) {
      this.where({ isDeleted: false });
    }
    next();
  });
}
