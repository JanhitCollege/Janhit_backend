import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import CustomError from '../../utils/CustomError.js';
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  IMAGE_SIZE_LIMIT,
  VIDEO_SIZE_LIMIT
} from './gallery.constants.js';

// Custom Storage Engine to dynamically route memory/disk based on file type
const customStorage = {
  _handleFile: function (req, file, cb) {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (isImage) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(new CustomError('Unsupported image format. Allowed formats: jpg, jpeg, png, webp', 400));
      }

      const chunks = [];
      let byteCount = 0;

      const onData = (chunk) => {
        byteCount += chunk.length;
        if (byteCount > IMAGE_SIZE_LIMIT) {
          file.stream.removeListener('data', onData);
          file.stream.removeListener('end', onEnd);
          file.stream.removeListener('error', onError);
          return cb(new CustomError('Image file size exceeds the 20 MB limit.', 400));
        }
        chunks.push(chunk);
      };

      const onEnd = () => {
        const buffer = Buffer.concat(chunks);
        cb(null, {
          buffer: buffer,
          size: buffer.length,
          mimetype: file.mimetype,
          originalname: file.originalname
        });
      };

      const onError = (err) => {
        cb(err);
      };

      file.stream.on('data', onData);
      file.stream.on('end', onEnd);
      file.stream.on('error', onError);

    } else if (isVideo) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
        return cb(new CustomError('Unsupported video format. Allowed formats: mp4, mov, avi, mkv, webm', 400));
      }

      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const uniqueName = crypto.randomUUID() + '-' + Date.now() + path.extname(file.originalname);
      const tempPath = path.join(tempDir, uniqueName);
      const outStream = fs.createWriteStream(tempPath);
      let byteCount = 0;
      let limitExceeded = false;

      const onData = (chunk) => {
        byteCount += chunk.length;
        if (byteCount > VIDEO_SIZE_LIMIT) {
          limitExceeded = true;
          file.stream.removeListener('data', onData);
          file.stream.removeListener('end', onEnd);
          file.stream.removeListener('error', onError);
          
          outStream.close(() => {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
            cb(new CustomError('Video file size exceeds the 100 MB limit.', 400));
          });
        }
      };

      const onEnd = () => {
        if (!limitExceeded) {
          cb(null, {
            path: tempPath,
            size: byteCount,
            filename: uniqueName,
            mimetype: file.mimetype,
            originalname: file.originalname
          });
        }
      };

      const onError = (err) => {
        outStream.close(() => {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
          cb(err);
        });
      };

      file.stream.on('data', onData);
      file.stream.pipe(outStream);
      file.stream.on('end', onEnd);
      file.stream.on('error', onError);
    } else {
      return cb(new CustomError('Invalid file type. Only images and videos are allowed.', 400));
    }
  },
  _removeFile: function (req, file, cb) {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, cb);
    } else {
      cb(null);
    }
  }
};

const upload = multer({
  storage: customStorage,
  limits: {
    // General limit matching video limit; dynamic storage engine checks image limit separately
    fileSize: VIDEO_SIZE_LIMIT
  }
});

export const uploadGalleryFile = (fieldName) => {
  const uploadSingle = upload.single(fieldName);

  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new CustomError('File size exceeds allowed limit.', 400));
          }
          return next(new CustomError(`Multer upload error: ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};
