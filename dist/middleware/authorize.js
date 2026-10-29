"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
const ApiError_1 = require("../utils/ApiError");
function authorize(...required) {
    return (req, _res, next) => {
        const permissions = req.auth?.permissions ?? [];
        if (!required.some((permission) => permissions.includes(permission))) {
            return next(new ApiError_1.ApiError(403, 'Insufficient permissions'));
        }
        next();
    };
}
