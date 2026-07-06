import multer from 'multer';
import path from 'path';
import CustomError from '../../utils/CustomError.js';

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_DOC_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/jpeg',
  'image/png',
  'image/webp'
];

const storage = multer.memoryStorage();

const makeFileFilter = (allowedExtensions, allowedMimeTypes, errorMessage) => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
      return cb(new CustomError(errorMessage, 400), false);
    }
    cb(null, true);
  };
};

const imageFilter = makeFileFilter(
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  'Invalid image type. Allowed formats: JPG, JPEG, PNG, WEBP'
);

const docFilter = makeFileFilter(
  ALLOWED_DOC_EXTENSIONS,
  ALLOWED_DOC_MIME_TYPES,
  'Invalid file type. Allowed formats: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP'
);

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

const uploadDoc = multer({
  storage,
  fileFilter: docFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

const makeUploadMiddleware = (uploader, fieldName, sizeLimitMsg) => {
  const uploadSingle = uploader.single(fieldName);
  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError(sizeLimitMsg, 400));
          }
          return next(new CustomError(`Multer upload error: ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};

export const uploadCommitteeBanner = makeUploadMiddleware(uploadImage, 'bannerImage', 'Banner image size exceeds allowed limit of 20 MB.');
export const uploadMemberPhoto = makeUploadMiddleware(uploadImage, 'photo', 'Photo size exceeds allowed limit of 20 MB.');
export const uploadCommitteeDoc = makeUploadMiddleware(uploadDoc, 'document', 'Document size exceeds allowed limit of 50 MB.');
