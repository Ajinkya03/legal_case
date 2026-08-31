import { Schema, model, Document } from 'mongoose';

export interface ILookup extends Document { name: string; type?: string; location?: string; district?: string; state?: string; }
const lookupSchema = new Schema<ILookup>({ name: { type: String, required: true, trim: true }, type: String, location: String, district: String, state: String }, { timestamps: true });
export const Lookup = model<ILookup>('Lookup', lookupSchema);
export const Court = model<ILookup>('Court', lookupSchema, 'courts');
export const Location = model<ILookup>('Location', lookupSchema, 'locations');