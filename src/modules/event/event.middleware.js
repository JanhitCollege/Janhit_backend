import multer from 'multer';
import path from 'path';
import CustomError from '../../utils/CustomError.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new CustomError('Invalid image type. Allowed formats: JPG, JPEG, PNG, WEBP', 400), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

export const uploadEventBanner = (fieldName) => {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError('File size exceeds allowed limit of 20 MB.', 400));
          }
          return next(new CustomError(`Multer upload error: ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};
