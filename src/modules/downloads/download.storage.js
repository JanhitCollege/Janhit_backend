import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import CustomError from '../../utils/CustomError.js';

/**
 * Validate S3 environment variables in production mode
 */
const validateS3Config = () => {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new CustomError('AWS S3 configuration is incomplete.', 500);
  }
};

/**
 * Reusable upload utility for Downloads module
 * Automatically switches between Local Storage and AWS S3 based on NODE_ENV
 */
export const uploadDownloadFile = async (file, campusSlug = 'global') => {
  if (!file) {
    throw new CustomError('No file provided for upload.', 400);
  }

  const fileExt = path.extname(file.originalname);
  const uniqueName = `${crypto.randomUUID()}-${Date.now()}${fileExt}`;
  
  if (process.env.NODE_ENV === 'production') {
    // Production Mode: AWS S3
    validateS3Config();
    const key = `downloads/${campusSlug}/${uniqueName}`.replace(/\\/g, '/');

    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await s3Client.send(command);
      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return {
        fileUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      };
    } catch (error) {
      throw new CustomError(`AWS S3 Upload Failed: ${error.message}`, 500);
    }
  } else {
    // Development Mode: Local Storage
    const relativeDir = path.join('uploads', 'downloads', campusSlug);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    const relativePath = path.join(relativeDir, uniqueName).replace(/\\/g, '/');
    const absolutePath = path.join(process.cwd(), relativePath);

    try {
      if (!fs.existsSync(absoluteDir)) {
        fs.mkdirSync(absoluteDir, { recursive: true });
      }

      fs.writeFileSync(absolutePath, file.buffer);

      return {
        fileUrl: relativePath, // Save only the relative path in the database
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      };
    } catch (error) {
      throw new CustomError(`Local File Upload Failed: ${error.message}`, 500);
    }
  }
};

/**
 * Reusable delete utility for Downloads module
 * Automatically switches between Local Storage and AWS S3 based on NODE_ENV
 */
export const deleteDownloadFile = async (fileUrl) => {
  if (!fileUrl) return;

  if (process.env.NODE_ENV === 'production') {
    // Production Mode: AWS S3
    validateS3Config();
    try {
      const s3UrlPattern = /\.amazonaws\.com\/(.+)$/;
      const match = fileUrl.match(s3UrlPattern);
      if (!match) return;
      const key = match[1];

      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error(`AWS S3 Delete Failed for URL ${fileUrl}: ${error.message}`);
    }
  } else {
    // Development Mode: Local Storage
    try {
      const absolutePath = path.join(process.cwd(), fileUrl);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      console.error(`Local File Delete Failed for URL ${fileUrl}: ${error.message}`);
    }
  }
};
