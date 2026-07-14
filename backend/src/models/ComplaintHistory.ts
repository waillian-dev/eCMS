import { Schema, model, Document, Types } from 'mongoose';

export interface IComplaintHistory extends Document {
  complaintId: Types.ObjectId;
  changedBy: Types.ObjectId;
  previousStatus: string;
  newStatus: string;
  remarks?: string;
  createdAt: Date;
}

const ComplaintHistorySchema = new Schema<IComplaintHistory>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation date
  }
);

export const ComplaintHistory = model<IComplaintHistory>('ComplaintHistory', ComplaintHistorySchema);
