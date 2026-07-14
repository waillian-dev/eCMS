import { Schema, model, Document, Types } from 'mongoose';

export interface IRating extends Document {
  complaintId: Types.ObjectId;
  citizenId: Types.ObjectId;
  ratingValue: number; // 1 to 5
  feedback: {
    resolutionQuality: number;
    officerBehavior: number;
    responseSpeed: number;
    overallExperience: number;
    comments?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      unique: true, // Only one rating per complaint
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratingValue: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      resolutionQuality: { type: Number, required: true, min: 1, max: 5 },
      officerBehavior: { type: Number, required: true, min: 1, max: 5 },
      responseSpeed: { type: Number, required: true, min: 1, max: 5 },
      overallExperience: { type: Number, required: true, min: 1, max: 5 },
      comments: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

export const Rating = model<IRating>('Rating', RatingSchema);
