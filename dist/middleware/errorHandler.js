"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
const ApiError_1 = require("../utils/ApiError");
const notFound = (req, _res, next) => {
    next(new ApiError_1.ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
exports.notFound = notFound;
const errorHandler = (error, _req, res, _next) => {
    const statusCode = error instanceof ApiError_1.ApiError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(statusCode).json({ success: false, message, errors: error instanceof ApiError_1.ApiError ? error.errors : undefined, statusCode });
};
exports.errorHandler = errorHandler;
