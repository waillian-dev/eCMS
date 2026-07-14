import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
    },
    previousState: {
      type: Schema.Types.Map,
      of: Schema.Types.Mixed,
    },
    newState: {
      type: Schema.Types.Map,
      of: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation date
  }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
