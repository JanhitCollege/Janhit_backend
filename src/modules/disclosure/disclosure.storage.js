import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import CustomError from '../../utils/CustomError.js';

const validateS3Config = () => {
  const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new CustomError('AWS S3 configuration is incomplete.', 500);
  }
};

export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const uploadDisclosureFile = async (file, campusSlug = 'global') => {
  if (!file) {
    throw new CustomError('No PDF file provided for upload.', 400);
  }

  const fileExt = path.extname(file.originalname) || '.pdf';
  const sanitizedOriginalName = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${sanitizedOriginalName}-${crypto.randomUUID().substring(0, 8)}-${Date.now()}${fileExt}`;
  const fileSizeFormatted = formatBytes(file.size);

  const hasS3Config = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME);

  if (hasS3Config) {
    const key = `disclosures/${campusSlug}/${uniqueName}`.replace(/\\/g, '/');

    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/pdf',
      });

      await s3Client.send(command);
      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

      return {
        fileUrl,
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/pdf',
        fileSize: fileSizeFormatted,
      };
    } catch (error) {
      console.error('AWS S3 Upload Notice: Failed to upload to S3, using local file fallback.', error.message);
    }
  }

  // Local storage fallback
  const relativeDir = path.join('uploads', 'disclosures', campusSlug);
  const absoluteDir = path.join(process.cwd(), relativeDir);
  const relativePath = path.join(relativeDir, uniqueName).replace(/\\/g, '/');
  const absolutePath = path.join(process.cwd(), relativePath);

  try {
    if (!fs.existsSync(absoluteDir)) {
      fs.mkdirSync(absoluteDir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, file.buffer);

    return {
      fileUrl: relativePath,
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/pdf',
      fileSize: fileSizeFormatted,
    };
  } catch (error) {
    throw new CustomError(`Local File Upload Failed: ${error.message}`, 500);
  }
};

export const deleteDisclosureFile = async (fileUrl) => {
  if (!fileUrl) return;

  if (process.env.NODE_ENV === 'production') {
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
