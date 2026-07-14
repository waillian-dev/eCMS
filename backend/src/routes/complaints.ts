import { Router } from 'express';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createComplaint,
  getComplaints,
  getCategoriesPublic,
  getComplaintById,
  updateComplaint,
  updateComplaintStatus,
  rateResolution,
  getComplaintMessages,
  createComplaintMessage,
} from '../controllers/complaints';

const router = Router();

// Secure all routes with JWT Auth
router.use(authenticateJWT);

router.get('/categories', getCategoriesPublic);
router.post('/', requirePermission('CREATE_COMPLAINT'), upload.array('attachments', 5), createComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.put('/:id', updateComplaint);
router.patch('/:id/status', updateComplaintStatus);
router.post('/:id/rate', rateResolution);
router.get('/:id/messages', getComplaintMessages);
router.post('/:id/messages', createComplaintMessage);

export default router;
