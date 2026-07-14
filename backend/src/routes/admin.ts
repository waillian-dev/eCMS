import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { getUsers, getDepartments, getCategories, getSystemAnalytics, getAuditLogs } from '../controllers/admin';

const router = Router();

// Secure all admin routes with JWT and Role check
router.use(authenticateJWT);
router.use(requireRole(['DEPT_MANAGER', 'SUPER_ADMIN']));

router.get('/users', getUsers);
router.get('/departments', getDepartments);
router.get('/categories', getCategories);
router.get('/analytics', getSystemAnalytics);
router.get('/audit-logs', getAuditLogs);

export default router;
