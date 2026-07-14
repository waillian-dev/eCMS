import { Schema, model, Document, Types } from 'mongoose';

export interface IAttachment {
  url: string;
  fileType: 'image' | 'video' | 'pdf';
  fileName: string;
  publicId?: string; // For Cloudinary asset management
}

export interface IComplaint extends Document {
  complaintNumber: string;
  title: string;
  description: string;
  citizenId: Types.ObjectId;
  categoryId: Types.ObjectId;
  departmentId: Types.ObjectId;
  assignedOfficerId?: Types.ObjectId;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status:
    | 'Draft'
    | 'Submitted'
    | 'UnderReview'
    | 'Assigned'
    | 'InProgress'
    | 'WaitingForCustomer'
    | 'Resolved'
    | 'Closed'
    | 'Rejected'
    | 'Escalated'
    | 'Reopened';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [Longitude, Latitude]
    address: string;
  };
  attachments: IAttachment[];
  isAnonymous: boolean;
  slaDeadline?: Date;
  escalationLevel: number;
  driverName?: string;
  licensePlate: string;
  tripId?: string;
  bookingReference?: string;
  routeFrom?: string;
  routeTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'video', 'pdf'], required: true },
  fileName: { type: String, required: true },
  publicId: { type: String },
});

const ComplaintSchema = new Schema<IComplaint>(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplaintCategory',
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    driverName: {
      type: String,
      trim: true,
    },
    licensePlate: {
      type: String,
      trim: true,
    },
    tripId: {
      type: String,
      trim: true,
    },
    bookingReference: {
      type: String,
      trim: true,
    },
    routeFrom: {
      type: String,
      trim: true,
    },
    routeTo: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Submitted',
        'UnderReview',
        'Assigned',
        'InProgress',
        'WaitingForCustomer',
        'Resolved',
        'Closed',
        'Rejected',
        'Escalated',
        'Reopened',
      ],
      default: 'Submitted',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    attachments: [AttachmentSchema],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    slaDeadline: {
      type: Date,
    },
    escalationLevel: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Geo-spatial index for coordinates
ComplaintSchema.index({ location: '2dsphere' });

export const Complaint = model<IComplaint>('Complaint', ComplaintSchema);
