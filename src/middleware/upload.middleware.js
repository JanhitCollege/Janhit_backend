import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';

const hasS3Config = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_BUCKET_NAME
);

let storage;

if (hasS3Config) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'faculties/' + uniqueSuffix + path.extname(file.originalname));
    },
  });
} else {
  // Fallback to local storage for development/testing
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'faculty-' + uniqueSuffix + path.extname(file.originalname));
    },
  });
}

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// A wrapper middleware to normalize file location across local disk and S3 storage
export const uploadImage = (fieldName) => {
  const uploadSingle = uploadMiddleware.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        return next(err);
      }
      if (req.file && !req.file.location) {
        // Normalize local file path to a URL-friendly path
        const port = process.env.PORT || 5000;
        const host = req.get('host') || `localhost:${port}`;
        const protocol = req.protocol || 'http';
        req.file.location = `${protocol}://${host}/uploads/${req.file.filename}`;
      }
      next();
    });
  };
};
