import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role: Types.ObjectId;
  designation?: string;
  phone?: string;
  status: 'active' | 'inactive';
  lastLoginAt?: Date;
  isDeleted: boolean;
  createdBy?: Types.ObjectId;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  username: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  designation: String,
  phone: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lastLoginAt: Date,
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const User = model<IUser>('User', userSchema);