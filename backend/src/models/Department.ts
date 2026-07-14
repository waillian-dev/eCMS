import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string; // e.g. Road Damage, Water Supply, Electricity
  description: string;
  code: string; // e.g. ROAD, WATER, ELEC
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
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
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Department = model<IDepartment>('Department', DepartmentSchema);
