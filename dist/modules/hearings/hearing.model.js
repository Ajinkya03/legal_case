"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hearing = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({ caseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Case', required: true }, hearingDate: { type: Date, required: true }, hearingOutcome: String, courtObservation: String, expectedAction: String, nextHearingDate: Date, responsiblePerson: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }, status: { type: String, enum: ['Completed', 'Upcoming', 'Adjourned', 'Cancelled'], default: 'Upcoming' }, isDeleted: { type: Boolean, default: false } }, { timestamps: true });
schema.index({ hearingDate: 1, status: 1 });
exports.Hearing = (0, mongoose_1.model)('Hearing', schema);
