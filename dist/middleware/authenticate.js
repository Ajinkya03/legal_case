"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const user_model_1 = require("../modules/users/user.model");
const role_model_1 = require("../modules/roles/role.model");
const authenticate = async (req, _res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token)
            throw new ApiError_1.ApiError(401, 'Authentication required');
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        const user = await user_model_1.User.findOne({ _id: payload.sub, isDeleted: false, status: 'active' });
        if (!user)
            throw new ApiError_1.ApiError(401, 'User account is unavailable');
        const role = await role_model_1.Role.findById(user.role);
        if (!role)
            throw new ApiError_1.ApiError(403, 'User role is unavailable');
        req.user = user;
        req.user.role = role._id;
        req.auth = { permissions: role.permissions };
        next();
    }
    catch (error) {
        next(error instanceof jsonwebtoken_1.default.JsonWebTokenError ? new ApiError_1.ApiError(401, 'Invalid or expired token') : error);
    }
};
exports.authenticate = authenticate;
