import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
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
  },
  {
    timestamps: true,
  }
);

export const Permission = model<IPermission>('Permission', PermissionSchema);
