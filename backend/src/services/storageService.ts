import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';

// Configure Cloudinary if keys are provided and not mock
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'mock' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary storage engine configured.');
} else {
  logger.info('Using local mock directory storage engine.');
}

interface UploadedFileResponse {
  url: string;
  publicId?: string;
  fileName: string;
  fileType: 'image' | 'video' | 'pdf';
}

export const uploadFile = async (
  localFilePath: string,
  originalName: string,
  mimeType: string
): Promise<UploadedFileResponse> => {
  // Determine file type
  let fileType: 'image' | 'video' | 'pdf' = 'image';
  if (mimeType.startsWith('video/')) {
    fileType = 'video';
  } else if (mimeType === 'application/pdf') {
    fileType = 'pdf';
  }

  // 1. Cloudinary upload path
  if (isCloudinaryConfigured) {
    try {
      const resourceType = fileType === 'pdf' ? 'raw' : fileType;
      const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: resourceType,
        folder: 'ecms_complaints',
      });

      // Remove local temp file
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        logger.error('Failed to delete temp file: %O', err);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: originalName,
        fileType,
      };
    } catch (error) {
      logger.error('Cloudinary upload failure: %O', error);
      throw new Error('Cloudinary upload failed.');
    }
  }

  // 2. Fallback local mock storage path
  try {
    const publicUploadsDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(originalName);
    const newFileName = `${uniqueSuffix}${fileExtension}`;
    const destinationPath = path.join(publicUploadsDir, newFileName);

    // Copy from temp path to public directory
    fs.renameSync(localFilePath, destinationPath);

    // Yield local relative web path (configured to static in Express app)
    const port = process.env.PORT || 5000;
    const url = `http://localhost:${port}/uploads/${newFileName}`;

    return {
      url,
      publicId: newFileName,
      fileName: originalName,
      fileType,
    };
  } catch (error) {
    logger.error('Local mock storage upload failure: %O', error);
    throw new Error('Local upload failed.');
  }
};

export const deleteFile = async (publicId: string, fileType: 'image' | 'video' | 'pdf'): Promise<void> => {
  if (isCloudinaryConfigured) {
    try {
      const resourceType = fileType === 'pdf' ? 'raw' : fileType;
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      logger.error('Cloudinary deletion failed for ID %s: %O', publicId, error);
    }
    return;
  }

  // Local file delete
  try {
    const filePath = path.join(__dirname, '../../public/uploads', publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.error('Local mock storage deletion failed for file %s: %O', publicId, error);
  }
};
