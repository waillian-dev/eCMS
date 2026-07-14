import { Schema, model, Document, Types } from 'mongoose';

export interface IComplaintCategory extends Document {
  name: string; // e.g. Potholes, Water Leakage, Power Outage
  description: string;
  defaultDepartmentId: Types.ObjectId;
  defaultPriority: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintCategorySchema = new Schema<IComplaintCategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    defaultDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    defaultPriority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
  },
  {
    timestamps: true,
  }
);

export const ComplaintCategory = model<IComplaintCategory>('ComplaintCategory', ComplaintCategorySchema);
