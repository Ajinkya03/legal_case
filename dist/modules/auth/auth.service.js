"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.refresh = refresh;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const ApiError_1 = require("../../utils/ApiError");
const user_model_1 = require("../users/user.model");
const role_model_1 = require("../roles/role.model");
function normalizeRoleName(roleName) {
    const normalized = roleName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (normalized.includes('super_admin'))
        return 'super_admin';
    if (normalized.includes('admin'))
        return 'admin';
    if (normalized.includes('user'))
        return 'user';
    return normalized;
}
async function login(identifier, password) {
    const user = await user_model_1.User.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }], isDeleted: false }).select('+passwordHash');
    if (!user || !(await bcryptjs_1.default.compare(password, user.passwordHash)))
        throw new ApiError_1.ApiError(401, 'Invalid credentials');
    if (user.status !== 'active')
        throw new ApiError_1.ApiError(403, 'User account is inactive');
    const role = await role_model_1.Role.findById(user.role);
    if (!role)
        throw new ApiError_1.ApiError(403, 'User role is unavailable');
    user.lastLoginAt = new Date();
    await user.save();
    const accessToken = jsonwebtoken_1.default.sign({ role: role.name, permissions: role.permissions }, env_1.env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env_1.env.JWT_ACCESS_EXPIRY });
    const refreshToken = jsonwebtoken_1.default.sign({}, env_1.env.JWT_REFRESH_SECRET, { subject: user.id, expiresIn: env_1.env.JWT_REFRESH_EXPIRY });
    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: normalizeRoleName(role.name), permissions: role.permissions } };
}
async function forgotPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await user_model_1.User.findOne({ email: normalizedEmail, isDeleted: false });
    if (!user) {
        return {
            message: 'If the email is registered, a password reset link has been sent.'
        };
    }
    const resetToken = jsonwebtoken_1.default.sign({ sub: user.id, purpose: 'password-reset' }, env_1.env.JWT_ACCESS_SECRET, { expiresIn: '30m' });
    return {
        message: 'Password reset instructions have been sent.',
        resetToken,
        expiresIn: '30m'
    };
}
async function resetPassword(token, password) {
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    }
    catch {
        throw new ApiError_1.ApiError(401, 'Invalid or expired reset token');
    }
    if (!payload.sub || payload.purpose !== 'password-reset') {
        throw new ApiError_1.ApiError(401, 'Invalid reset token');
    }
    const user = await user_model_1.User.findById(payload.sub);
    if (!user || user.isDeleted) {
        throw new ApiError_1.ApiError(401, 'User account is unavailable');
    }
    user.passwordHash = await bcryptjs_1.default.hash(password, 12);
    await user.save();
    return {
        message: 'Password reset successful'
    };
}
async function refresh(refreshToken) {
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
    }
    catch {
        throw new ApiError_1.ApiError(401, 'Invalid or expired refresh token');
    }
    if (!payload.sub)
        throw new ApiError_1.ApiError(401, 'Invalid refresh token');
    const user = await user_model_1.User.findOne({ _id: payload.sub, isDeleted: false, status: 'active' });
    if (!user)
        throw new ApiError_1.ApiError(401, 'User account is unavailable');
    const role = await role_model_1.Role.findById(user.role);
    if (!role)
        throw new ApiError_1.ApiError(403, 'User role is unavailable');
    const accessToken = jsonwebtoken_1.default.sign({ role: role.name, permissions: role.permissions }, env_1.env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env_1.env.JWT_ACCESS_EXPIRY });
    return { accessToken };
}
