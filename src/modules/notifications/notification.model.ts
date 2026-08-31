import { Schema, model, Document, Types } from 'mongoose';
export interface INotification extends Document { userId: Types.ObjectId; type: string; title: string; message: string; relatedCaseId?: Types.ObjectId; isRead: boolean; }
const schema = new Schema<INotification>({ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, type: String, title: String, message: String, relatedCaseId: { type: Schema.Types.ObjectId, ref: 'Case' }, isRead: { type: Boolean, default: false } }, { timestamps: true });
export const Notification = model<INotification>('Notification', schema);