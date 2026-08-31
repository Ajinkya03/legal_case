import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import caseRoutes from '../modules/cases/case.routes';
import operationsRoutes from './operations';

const router = Router();
router.use('/auth', authRoutes);
router.use('/cases', caseRoutes);
router.use('/', operationsRoutes);

export default router;