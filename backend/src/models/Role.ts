import { Schema, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
  name: string; // e.g. CITIZEN, SUPPORT_OFFICER, DEPT_MANAGER, SUPER_ADMIN
  description: string;
  permissions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
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
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Role = model<IRole>('Role', RoleSchema);
