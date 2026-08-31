import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { User } from '../modules/users/user.model';
import { Role } from '../modules/roles/role.model';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new ApiError(401, 'Authentication required');
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    const user = await User.findOne({ _id: payload.sub, isDeleted: false, status: 'active' });
    if (!user) throw new ApiError(401, 'User account is unavailable');
    const role = await Role.findById(user.role);
    if (!role) throw new ApiError(403, 'User role is unavailable');
    req.user = user;
    req.user.role = role._id;
    req.auth = { permissions: role.permissions };
    next();
  } catch (error) {
    next(error instanceof jwt.JsonWebTokenError ? new ApiError(401, 'Invalid or expired token') : error);
  }
};