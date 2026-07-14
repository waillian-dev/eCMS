import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { logger } from '../config/logger';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header is missing.' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Token format must be Bearer <token>.' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Failed to verify JWT access token: %O', error);
    res.status(401).json({ error: 'Invalid or expired access token.' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const hasPermission = req.user.permissions.includes(permission);
    if (!hasPermission) {
      logger.warn(`User ${req.user.email} denied permission ${permission}`);
      res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
      return;
    }

    next();
  };
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const hasRole = roles.includes(req.user.role);
    if (!hasRole) {
      logger.warn(`User ${req.user.email} denied role match for ${roles.join(', ')}`);
      res.status(403).json({ error: 'Forbidden: Role restricted action.' });
      return;
    }

    next();
  };
};
