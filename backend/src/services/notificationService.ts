import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { logger } from '../config/logger';

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    // 1. Fetch user to check pushToken presence
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`Push Service: Target user ID ${userId} not found.`);
      return;
    }

    // Save in-app notification to DB
    const notif = new Notification({
      recipientId: userId,
      title,
      message: body,
      complaintId: data?.complaintId,
      type: data?.type || 'SYSTEM',
    });
    await notif.save();

    if (!user.pushToken || !user.pushToken.startsWith('ExponentPushToken')) {
      logger.debug(`Push Service: User ${user.email} does not have a valid Expo push token.`);
      return;
    }

    // 2. Dispatch push payload to Expo Push API using native fetch
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });

    if (response.ok) {
      logger.info(`Push Service: Successfully sent push notification to ${user.email}`);
    } else {
      const errorText = await response.text();
      logger.warn(`Push Service: Expo API returned status ${response.status}: ${errorText}`);
    }
  } catch (error) {
    logger.error('Failed to dispatch push notification: %O', error);
  }
};
