import { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

export function authorize(...required: string[]): RequestHandler {
  return (req, _res, next) => {
    const permissions = (req as typeof req & { auth?: { permissions: string[] } }).auth?.permissions ?? [];
    if (!required.some((permission) => permissions.includes(permission))) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}