import mongoose from 'mongoose';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecms';

  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB database connection established successfully.');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB database connection error: %O', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB database connection lost.');
    });

    await mongoose.connect(uri);
  } catch (error) {
    logger.error('Failed to connect to MongoDB on startup: %O', error);
    process.exit(1);
  }
};
