import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { forgotPasswordController, loginController, logoutController, meController, refreshController, resetPasswordController } from './auth.controller';

const router = Router();
router.post('/login', loginController);
router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.get('/me', authenticate, meController);
export default router;