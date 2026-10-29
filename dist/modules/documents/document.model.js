"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({ caseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Case', required: true }, hearingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Hearing' }, fileName: { type: String, required: true }, fileType: { type: String, required: true }, fileSizeBytes: { type: Number, required: true }, storageUrl: { type: String, required: true }, uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }, category: String, isDeleted: { type: Boolean, default: false } }, { timestamps: true });
exports.DocumentModel = (0, mongoose_1.model)('Document', schema);
