import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { logger } from '../config/logger';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ recipientId: req.user!.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(notifications);
  } catch (error) {
    logger.error('Failed to get notifications: %O', error);
    res.status(500).json({ error: 'Internal server error while fetching notifications.' });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (id) {
      // Mark single notification as read
      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientId: req.user!.userId },
        { isRead: true },
        { new: true }
      );
      if (!notification) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
      }
      res.status(200).json(notification);
    } else {
      // Mark all as read
      await Notification.updateMany({ recipientId: req.user!.userId, isRead: false }, { isRead: true });
      res.status(200).json({ message: 'All notifications marked as read.' });
    }
  } catch (error) {
    logger.error('Failed to mark notifications as read: %O', error);
    res.status(500).json({ error: 'Failed to update notification status.' });
  }
};
