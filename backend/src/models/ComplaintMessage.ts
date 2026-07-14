import { Schema, model, Document, Types } from 'mongoose';
import { IAttachment } from './Complaint';

export interface IComplaintMessage extends Document {
  complaintId: Types.ObjectId;
  senderId: Types.ObjectId;
  messageText: string;
  attachments: IAttachment[];
  readBy: {
    userId: Types.ObjectId;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'video', 'pdf'], required: true },
  fileName: { type: String, required: true },
  publicId: { type: String },
});

const ComplaintMessageSchema = new Schema<IComplaintMessage>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageText: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [AttachmentSchema],
    readBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const ComplaintMessage = model<IComplaintMessage>('ComplaintMessage', ComplaintMessageSchema);
