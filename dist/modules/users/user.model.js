"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    username: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Role', required: true },
    designation: String,
    phone: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastLoginAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
exports.User = (0, mongoose_1.model)('User', userSchema);
