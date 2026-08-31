import type { Types } from 'mongoose';

export interface AuthUser {
  id: string;
  roleId: Types.ObjectId;
  permissions: string[];
}