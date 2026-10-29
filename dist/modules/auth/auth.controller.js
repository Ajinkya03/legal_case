"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutController = exports.refreshController = exports.meController = exports.resetPasswordController = exports.forgotPasswordController = exports.loginController = void 0;
const auth_validation_1 = require("./auth.validation");
const auth_service_1 = require("./auth.service");
const ApiError_1 = require("../../utils/ApiError");
const loginController = async (req, res, next) => {
    try {
        const input = auth_validation_1.loginSchema.parse(req.body);
        const identifier = input.identifier || req.body.email;
        res.json({ success: true, data: await (0, auth_service_1.login)(identifier, input.password) });
    }
    catch (error) {
        next(error);
    }
};
exports.loginController = loginController;
const forgotPasswordController = async (req, res, next) => {
    try {
        const input = auth_validation_1.forgotPasswordSchema.parse(req.body);
        const result = await (0, auth_service_1.forgotPassword)(input.email);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPasswordController = forgotPasswordController;
const resetPasswordController = async (req, res, next) => {
    try {
        const input = auth_validation_1.resetPasswordSchema.parse(req.body);
        const result = await (0, auth_service_1.resetPassword)(input.token, input.password);
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPasswordController = resetPasswordController;
const meController = async (req, res, next) => {
    try {
        if (!req.user)
            throw new ApiError_1.ApiError(401, 'Authentication required');
        const user = await req.user.populate('role');
        res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        next(error);
    }
};
exports.meController = meController;
const refreshController = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken ?? req.body.refreshToken;
        if (!token)
            throw new ApiError_1.ApiError(401, 'Refresh token required');
        res.json({ success: true, data: await (0, auth_service_1.refresh)(token) });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshController = refreshController;
const logoutController = (_req, res) => {
    res.clearCookie('refreshToken').json({ success: true, message: 'Logged out' });
};
exports.logoutController = logoutController;
