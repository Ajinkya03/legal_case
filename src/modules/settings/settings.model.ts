import { Schema, model, Document, Types } from 'mongoose';
export interface ISettings extends Document {
  singleton: string;
  systemName: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  itemsPerPage: number;
  darkMode: boolean;
  compactView: boolean;
  showCaseId: boolean;
  showHearingReminders: boolean;
  notifications: Record<string, boolean>;
  passwordExpiryDays?: number;
  sessionTimeoutMinutes?: number;
  twoFactorEnabled?: boolean;
  allowConcurrentSessions?: boolean;
  integrations?: Record<string, any>;
  updatedBy?: Types.ObjectId;
}
const schema = new Schema<ISettings>({
  singleton: { type: String, unique: true, default: 'default' },
  systemName: { type: String, default: 'Legal Case MIS' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  timeFormat: { type: String, default: '12h' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  itemsPerPage: { type: Number, default: 20 },
  darkMode: { type: Boolean, default: false },
  compactView: { type: Boolean, default: false },
  showCaseId: { type: Boolean, default: true },
  showHearingReminders: { type: Boolean, default: true },
  notifications: { type: Object, default: {} },
  passwordExpiryDays: { type: Number, default: 90 },
  sessionTimeoutMinutes: { type: Number, default: 60 },
  twoFactorEnabled: { type: Boolean, default: false },
  allowConcurrentSessions: { type: Boolean, default: false },
  integrations: { type: Object, default: {} },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
export const Settings = model<ISettings>('SystemSettings', schema);