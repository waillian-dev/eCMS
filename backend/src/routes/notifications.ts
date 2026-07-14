import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { getNotifications, markAsRead } from '../controllers/notifications';

const router = Router();

router.use(authenticateJWT);

router.get('/', getNotifications);
router.patch('/readAll', markAsRead);
router.patch('/:id/read', markAsRead);

export default router;
