import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { User } from '../users/user.model';
import { Role } from '../roles/role.model';

function normalizeRoleName(roleName: string): string {
  const normalized = roleName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (normalized.includes('super_admin')) return 'super_admin';
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('user')) return 'user';
  return normalized;
}

export async function login(identifier: string, password: string) {
  const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }], isDeleted: false }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, 'Invalid credentials');
  if (user.status !== 'active') throw new ApiError(403, 'User account is inactive');
  const role = await Role.findById(user.role);
  if (!role) throw new ApiError(403, 'User role is unavailable');
  user.lastLoginAt = new Date();
  await user.save();
  const accessToken = jwt.sign({ role: role.name, permissions: role.permissions }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] });
  const refreshToken = jwt.sign({}, env.JWT_REFRESH_SECRET, { subject: user.id, expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'] });
  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: normalizeRoleName(role.name), permissions: role.permissions } };
}

export async function forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

  if (!user) {
    return {
      message: 'If the email is registered, a password reset link has been sent.'
    };
  }

  const resetToken = jwt.sign(
    { sub: user.id, purpose: 'password-reset' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '30m' }
  );

  return {
    message: 'Password reset instructions have been sent.',
    resetToken,
    expiresIn: '30m'
  };
}

export async function resetPassword(token: string, password: string) {
  let payload: { sub?: string; purpose?: string };

  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub?: string; purpose?: string };
  } catch {
    throw new ApiError(401, 'Invalid or expired reset token');
  }

  if (!payload.sub || payload.purpose !== 'password-reset') {
    throw new ApiError(401, 'Invalid reset token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.isDeleted) {
    throw new ApiError(401, 'User account is unavailable');
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();

  return {
    message: 'Password reset successful'
  };
}

export async function refresh(refreshToken: string) {
  let payload: { sub?: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub?: string };
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
  if (!payload.sub) throw new ApiError(401, 'Invalid refresh token');
  const user = await User.findOne({ _id: payload.sub, isDeleted: false, status: 'active' });
  if (!user) throw new ApiError(401, 'User account is unavailable');
  const role = await Role.findById(user.role);
  if (!role) throw new ApiError(403, 'User role is unavailable');
  const accessToken = jwt.sign({ role: role.name, permissions: role.permissions }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] });
  return { accessToken };
}