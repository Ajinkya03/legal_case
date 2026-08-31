import { Schema, model, Document, Types } from 'mongoose';

export interface ICaseTimelineItem {
  type: string;
  description: string;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
}

export interface ICase extends Document {
  caseId: string; caseTitle: string; caseType: string; plaintiff: string; defendant: string;
  villageLocation?: Types.ObjectId; court?: Types.ObjectId; filingDate: Date;
  currentStatus: string; nextHearingDate?: Date; priority: string; cmdDecisionRequired: boolean;
  assignedPerson: Types.ObjectId; remarks?: string; tags: string[]; legalTeam: { userId: Types.ObjectId; role: string; name: string }[];
  isCritical: boolean; isDeleted: boolean; createdBy: Types.ObjectId; updatedBy?: Types.ObjectId;
  createdAt?: Date; updatedAt?: Date; timeline?: ICaseTimelineItem[];
}

const caseSchema = new Schema<ICase>({
  caseId: { type: String, unique: true, index: true }, caseTitle: { type: String, required: true, trim: true },
  caseType: { type: String, enum: ['Civil', 'Criminal', 'Revenue', 'Family', 'Others'], required: true },
  plaintiff: { type: String, required: true }, defendant: { type: String, required: true },
  villageLocation: { type: Schema.Types.ObjectId, ref: 'Location' }, court: { type: Schema.Types.ObjectId, ref: 'Court' },
  filingDate: { type: Date, required: true }, currentStatus: { type: String, enum: ['Active', 'Closed', 'Stayed', 'Other'], default: 'Active' },
  nextHearingDate: Date, priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  cmdDecisionRequired: { type: Boolean, default: false }, assignedPerson: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  remarks: String, tags: { type: [String], default: [] }, legalTeam: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, role: String, name: String }],
  isCritical: { type: Boolean, default: false }, isDeleted: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  timeline: [{
    type: { type: String, default: 'system' },
    description: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });
caseSchema.index({ currentStatus: 1, priority: 1 });
caseSchema.index({ nextHearingDate: 1 });
caseSchema.index({ caseTitle: 'text', plaintiff: 'text', defendant: 'text', caseId: 'text' });
export const Case = model<ICase>('Case', caseSchema);