"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEvent = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({ title: { type: String, required: true }, type: { type: String, enum: ['Hearing', 'Deadline', 'Meeting', 'Holiday', 'Custom'], required: true }, date: { type: Date, required: true }, time: String, caseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Case' }, hearingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Hearing' }, description: String, createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
exports.CalendarEvent = (0, mongoose_1.model)('CalendarEvent', schema);
