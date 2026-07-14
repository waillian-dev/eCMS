import { Router } from 'express';
import { registerCitizen, login, refreshToken, sendOTP, verifyOTP, logout } from '../controllers/auth';

const router = Router();

router.post('/register', registerCitizen);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/otp/send', sendOTP);
router.post('/otp/verify', verifyOTP);
router.post('/logout', logout);

export default router;
