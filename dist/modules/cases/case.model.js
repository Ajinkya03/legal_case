"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Case = void 0;
const mongoose_1 = require("mongoose");
const lookup_model_1 = require("../lookups/lookup.model");
const user_model_1 = require("../users/user.model");
const caseSchema = new mongoose_1.Schema({
    caseId: { type: String, unique: true, index: true }, caseTitle: { type: String, required: true, trim: true },
    caseType: { type: String, enum: ['Civil', 'Criminal', 'Revenue', 'Family', 'Others'], required: true },
    plaintiff: { type: String, required: true }, defendant: { type: String, required: true },
    plaintiffAdvocate: String, defendantAdvocate: String, caseNumber: String, year: Number, reasonForSuit: String,
    practiceArea: String, caseStage: String,
    villageLocation: { type: mongoose_1.Schema.Types.ObjectId, ref: lookup_model_1.Location.modelName }, court: { type: mongoose_1.Schema.Types.ObjectId, ref: lookup_model_1.Court.modelName },
    filingDate: Date, registrationDate: Date, currentStatus: { type: String, default: 'Active', trim: true },
    nextHearingDate: Date, priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    cmdDecisionRequired: { type: Boolean, default: false }, assignedPerson: { type: mongoose_1.Schema.Types.ObjectId, ref: user_model_1.User.modelName, required: true },
    remarks: String, tags: { type: [String], default: [] }, keywords: { type: [String], default: [] }, legalTeam: [{ userId: { type: mongoose_1.Schema.Types.ObjectId, ref: user_model_1.User.modelName }, role: String, name: String }],
    isCritical: { type: Boolean, default: false }, isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: user_model_1.User.modelName, required: true }, updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: user_model_1.User.modelName },
    timeline: [{
            type: { type: String, default: 'system' },
            description: { type: String, required: true },
            createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: user_model_1.User.modelName },
            createdAt: { type: Date, default: Date.now }
        }]
}, { timestamps: true });
caseSchema.index({ currentStatus: 1, priority: 1 });
caseSchema.index({ nextHearingDate: 1 });
caseSchema.index({ caseTitle: 'text', plaintiff: 'text', defendant: 'text', caseId: 'text' });
exports.Case = (0, mongoose_1.model)('Case', caseSchema);
