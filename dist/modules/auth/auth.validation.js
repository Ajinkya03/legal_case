"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().optional(),
    identifier: zod_1.z.string().min(1).optional(),
    username: zod_1.z.string().min(1).optional(),
    password: zod_1.z.string().min(8)
})
    .transform((value) => ({
    identifier: value.email ?? value.identifier ?? value.username ?? '',
    password: value.password
}))
    .refine((value) => value.identifier.length > 0, {
    message: 'Email is required',
    path: ['email']
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email()
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8)
});
