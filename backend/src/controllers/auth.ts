import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { IPermission } from '../models/Permission';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';
import { logger } from '../config/logger';

// Simple in-memory storage for development OTPs
const otpStorage = new Map<string, { code: string; expiresAt: number }>();

export const registerCitizen = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: 'Email is already registered.' });
      return;
    }

    // Fetch the citizen role
    const citizenRole = await Role.findOne({ name: 'CITIZEN' });
    if (!citizenRole) {
      res.status(500).json({ error: 'System Roles are not initialized.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      phone,
      passwordHash,
      roleId: citizenRole._id,
      status: 'Active',
    });

    await newUser.save();

    logger.info(`New citizen registered: ${email}`);
    res.status(201).json({ message: 'User registered successfully. You can now login.' });
  } catch (error) {
    logger.error('Error in citizen registration: %O', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const user = await User.findOne({ email }).populate({
      path: 'roleId',
      populate: { path: 'permissions' },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'Active') {
      res.status(403).json({ error: `Your account is currently ${user.status}.` });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const roleObj = user.roleId as unknown as { name: string; permissions: IPermission[] };
    const permissions = roleObj.permissions.map((p) => p.name);

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: roleObj.name,
      permissions,
      departmentId: user.departmentId?.toString(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: roleObj.name,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    logger.error('Login error: %O', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required.' });
    return;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).populate({
      path: 'roleId',
      populate: { path: 'permissions' },
    });

    if (!user || user.status !== 'Active') {
      res.status(401).json({ error: 'Invalid session or user account suspended.' });
      return;
    }

    const roleObj = user.roleId as unknown as { name: string; permissions: IPermission[] };
    const permissions = roleObj.permissions.map((p) => p.name);

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: roleObj.name,
      permissions,
      departmentId: user.departmentId?.toString(),
    };

    const accessToken = generateAccessToken(payload);

    res.status(200).json({ accessToken });
  } catch (error) {
    logger.warn('Token refresh failure: %O', error);
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;

  if (!phone) {
    res.status(400).json({ error: 'Phone number is required.' });
    return;
  }

  try {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins expiration

    otpStorage.set(phone, { code, expiresAt });

    // In production, connect this to SMS provider (Twilio, etc.)
    logger.info(`[SMS MOCK] Sent OTP code "${code}" to phone: ${phone}`);

    res.status(200).json({ message: 'OTP sent successfully (check backend log).' });
  } catch (error) {
    logger.error('Error sending OTP: %O', error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    res.status(400).json({ error: 'Phone number and OTP code are required.' });
    return;
  }

  try {
    const savedOtp = otpStorage.get(phone);

    if (!savedOtp) {
      res.status(400).json({ error: 'No OTP requested for this phone number.' });
      return;
    }

    if (Date.now() > savedOtp.expiresAt) {
      otpStorage.delete(phone);
      res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      return;
    }

    if (savedOtp.code !== code) {
      res.status(400).json({ error: 'Invalid OTP code.' });
      return;
    }

    // Success! Clear OTP
    otpStorage.delete(phone);

    // Find user or create a new user with CITIZEN role if this is a first-time phone sign-up
    let user = await User.findOne({ phone }).populate({
      path: 'roleId',
      populate: { path: 'permissions' },
    });

    if (!user) {
      const citizenRole = await Role.findOne({ name: 'CITIZEN' });
      if (!citizenRole) {
        res.status(500).json({ error: 'Roles not initialized.' });
        return;
      }

      // Generate mock email for phone-only signup
      const email = `phone-${phone}@ecms.gov`;
      user = new User({
        name: `Citizen ${phone.slice(-4)}`,
        email,
        phone,
        roleId: citizenRole._id,
        status: 'Active',
      });
      await user.save();

      // Populate roles/permissions for the new user
      user = await User.findById(user._id).populate({
        path: 'roleId',
        populate: { path: 'permissions' },
      });
    }

    if (!user) {
      res.status(500).json({ error: 'Failed to retrieve or create user.' });
      return;
    }

    const roleObj = user.roleId as unknown as { name: string; permissions: IPermission[] };
    const permissions = roleObj.permissions.map((p) => p.name);

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: roleObj.name,
      permissions,
      departmentId: user.departmentId?.toString(),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: roleObj.name,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    logger.error('Error verifying OTP: %O', error);
    res.status(500).json({ error: 'Internal server error during OTP verification.' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Stateless JWT doesn't strictly need backend deletion unless blacklist is added.
  // We can return a success message telling the client to wipe their cookies/secure store.
  res.status(200).json({ message: 'Logout successful. Wipe local tokens.' });
};
