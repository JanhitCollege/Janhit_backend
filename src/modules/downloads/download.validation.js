import CustomError from '../../utils/CustomError.js';
import path from 'path';

const ALLOWED_CATEGORIES = [
  'ADMISSION_FORM',
  'BROCHURE',
  'FEE_STRUCTURE',
  'PROSPECTUS',
  'ACADEMIC_CALENDAR',
  'SYLLABUS',
  'EXAM_SCHEDULE',
  'NOTICE',
  'HOSTEL_FORM',
  'SCHOLARSHIP_FORM',
  'PLACEMENT_BROCHURE',
  'MAGAZINE',
  'OTHER'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

/**
 * Validate file properties
 */
const validateUploadedFile = (file) => {
  if (!file) return 'File is required.';
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return 'Invalid file type. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX';
  }
  return null;
};

/**
 * Validate Create Download
 */
export const validateCreateDownload = (req, res, next) => {
  const { title, category, campusId, description } = req.body;

  // Title (Required)
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Title is required and must be a non-empty string.', 400));
  }

  // Category (Required)
  if (!category || typeof category !== 'string' || category.trim() === '') {
    return next(new CustomError('Category is required and must be a non-empty string.', 400));
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return next(new CustomError(`Invalid category. Allowed values: ${ALLOWED_CATEGORIES.join(', ')}`, 400));
  }

  // CampusId (Optional)
  if (campusId !== undefined && campusId !== null && campusId !== '' && campusId !== 'null') {
    if (typeof campusId !== 'string') {
      return next(new CustomError('CampusId must be a string.', 400));
    }
  }

  // Description (Optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return next(new CustomError('Description must be a string.', 400));
    }
  }

  // File (Required for creation)
  const fileError = validateUploadedFile(req.file);
  if (fileError) {
    return next(new CustomError(fileError, 400));
  }

  next();
};

/**
 * Validate Update Download
 */
export const validateUpdateDownload = (req, res, next) => {
  const { title, category, campusId, description, isActive } = req.body;

  // Title (Optional)
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return next(new CustomError('Title cannot be empty.', 400));
    }
  }

  // Category (Optional)
  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim() === '') {
      return next(new CustomError('Category cannot be empty.', 400));
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return next(new CustomError(`Invalid category. Allowed values: ${ALLOWED_CATEGORIES.join(', ')}`, 400));
    }
  }

  // CampusId (Optional)
  if (campusId !== undefined && campusId !== null && campusId !== '' && campusId !== 'null') {
    if (typeof campusId !== 'string') {
      return next(new CustomError('CampusId must be a string.', 400));
    }
  }

  // Description (Optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return next(new CustomError('Description must be a string.', 400));
    }
  }

  // isActive (Optional)
  if (isActive !== undefined) {
    const isBool = typeof isActive === 'boolean' || isActive === 'true' || isActive === 'false';
    if (!isBool) {
      return next(new CustomError('isActive must be a boolean.', 400));
    }
  }

  // File (Optional for update)
  if (req.file) {
    const fileError = validateUploadedFile(req.file);
    if (fileError) {
      return next(new CustomError(fileError, 400));
    }
  }

  next();
};
