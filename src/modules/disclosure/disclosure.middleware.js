import multer from 'multer';
import CustomError from '../../utils/CustomError.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new CustomError('Invalid file format. Only PDF files (application/pdf) are allowed.', 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB Limit as per spec
  },
});

export const uploadDisclosurePdf = (fieldName = 'file', optional = false) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError('File size exceeds the maximum limit of 100MB.', 400));
          }
          return next(new CustomError(`Upload error: ${err.message}`, 400));
        }
        return next(err);
      }

      if (!optional && !req.file) {
        return next(new CustomError('Please upload a PDF document.', 400));
      }

      next();
    });
  };
};
