import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import CustomError from '../../utils/CustomError.js';

// Base Storage Driver
export class BaseStorageDriver {
  async upload(fileSource, key, mimeType, reqProtocol, reqHost) {
    throw new Error('Upload method not implemented');
  }
  async delete(fileUrl) {
    throw new Error('Delete method not implemented');
  }
}

// Local Storage Driver
export class LocalStorageDriver extends BaseStorageDriver {
  async upload(fileSource, key, mimeType, reqProtocol, reqHost) {
    const urlKey = key.replace(/\\/g, '/');
    try {
      const localPath = path.join(process.cwd(), 'uploads', urlKey);
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      if (Buffer.isBuffer(fileSource)) {
        fs.writeFileSync(localPath, fileSource);
      } else {
        fs.copyFileSync(fileSource, localPath);
      }

      const cleanHost = reqHost || `localhost:${process.env.PORT || 5000}`;
      const cleanProtocol = reqProtocol || 'http';
      return `${cleanProtocol}://${cleanHost}/uploads/${urlKey}`;
    } catch (error) {
      throw new CustomError(`Local File Upload Failed: ${error.message}`, 500);
    }
  }

  async delete(fileUrl) {
    if (!fileUrl) return;
    try {
      const localUrlPattern = /\/uploads\/(.+)$/;
      const match = fileUrl.match(localUrlPattern);
      if (!match) return;

      const key = match[1];
      const localPath = path.join(process.cwd(), 'uploads', key);

      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (error) {
      console.error(`Local File Delete Failed for URL ${fileUrl}: ${error.message}`);
    }
  }
}

// S3 Storage Driver
export class S3StorageDriver extends BaseStorageDriver {
  constructor() {
    super();
    // Validate config at instantiation
    const required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
      throw new CustomError('AWS S3 configuration is incomplete.', 500);
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async upload(fileSource, key, mimeType, reqProtocol, reqHost) {
    const urlKey = key.replace(/\\/g, '/');
    try {
      let body;
      if (Buffer.isBuffer(fileSource)) {
        body = fileSource;
      } else {
        body = fs.createReadStream(fileSource);
      }

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: urlKey,
        Body: body,
        ContentType: mimeType,
        ACL: 'public-read'
      });

      await this.s3Client.send(command);
      return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${urlKey}`;
    } catch (error) {
      throw new CustomError(`AWS S3 Upload Failed: ${error.message}`, 500);
    }
  }

  async delete(fileUrl) {
    if (!fileUrl) return;
    try {
      const s3UrlPattern = /\.amazonaws\.com\/(.+)$/;
      const match = fileUrl.match(s3UrlPattern);
      if (!match) return;
      const key = match[1];

      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`AWS S3 Delete Failed for URL ${fileUrl}: ${error.message}`);
    }
  }
}

/**
 * Validate storage environment configuration during startup or requests
 */
export const validateStorageConfig = () => {
  const driver = process.env.STORAGE_DRIVER;
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === 'production') {
    if (driver !== 's3') {
      throw new CustomError('Production environment requires AWS S3 storage.', 500);
    }
  }

  if (driver === 's3') {
    const requiredS3Env = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_BUCKET_NAME'
    ];
    const missing = requiredS3Env.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new CustomError('AWS S3 configuration is incomplete.', 500);
    }
  } else if (nodeEnv === 'development' && driver === 'local') {
    // Valid development local config
  } else {
    // Any other combination (e.g. production/test/unspecified with local) is forbidden
    throw new CustomError('Production environment requires AWS S3 storage.', 500);
  }
};

/**
 * Get configured Storage Driver instance
 */
export const getStorageDriver = () => {
  validateStorageConfig();

  const driver = process.env.STORAGE_DRIVER;
  if (driver === 's3') {
    return new S3StorageDriver();
  }
  return new LocalStorageDriver();
};
