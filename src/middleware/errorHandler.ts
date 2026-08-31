import { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(statusCode).json({ success: false, message, errors: error instanceof ApiError ? error.errors : undefined, statusCode });
};