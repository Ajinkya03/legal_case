"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
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
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
exports.Settings = (0, mongoose_1.model)('SystemSettings', schema);
