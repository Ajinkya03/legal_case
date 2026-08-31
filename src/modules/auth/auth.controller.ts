import { RequestHandler } from 'express';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from './auth.validation';
import { forgotPassword, login, refresh, resetPassword } from './auth.service';
import { ApiError } from '../../utils/ApiError';

export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const identifier = input.identifier || req.body.email;
    res.json({ success: true, data: await login(identifier, input.password) });
  } catch (error) { next(error); }
};

export const forgotPasswordController: RequestHandler = async (req, res, next) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const result = await forgotPassword(input.email);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const resetPasswordController: RequestHandler = async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(input.token, input.password);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const meController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    const user = await req.user.populate('role');
    res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
};

export const refreshController: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken ?? req.body.refreshToken;
    if (!token) throw new ApiError(401, 'Refresh token required');
    res.json({ success: true, data: await refresh(token) });
  } catch (error) { next(error); }
};

export const logoutController: RequestHandler = (_req, res) => {
  res.clearCookie('refreshToken').json({ success: true, message: 'Logged out' });
};