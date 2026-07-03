import CustomError from '../../utils/CustomError.js';

// Allowed extensions
const THUMBNAIL_EXTENSIONS = ['.jpg', '.png', '.webp'];
const ATTACHMENT_EXTENSIONS = ['.pdf', '.doc', '.docx'];

// Helper to validate file extension
const hasValidExtension = (filePath, allowedExtensions) => {
  if (filePath === undefined || filePath === null || filePath === '') return true;
  if (typeof filePath !== 'string') return false;
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return false;
  const ext = filePath.slice(lastDot).toLowerCase();
  return allowedExtensions.includes(ext);
};

// Helper to validate UUID format
const isUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Validate Create NewsNotice payload
 */
export const validateCreateNewsNotice = (req, res, next) => {
  const {
    title,
    excerpt,
    description,
    type,
    visibility,
    featured,
    priority,
    publishDate,
    expiryDate,
    status,
    campuses,
    metaTitle,
    metaDescription,
    metaKeywords,
    thumbnail,
    attachment
  } = req.body;

  // Title (Required)
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Title is required and must be a non-empty string.', 400));
  }

  // Excerpt (Required)
  if (!excerpt || typeof excerpt !== 'string' || excerpt.trim() === '') {
    return next(new CustomError('Excerpt is required and must be a non-empty string.', 400));
  }

  // Description (Required)
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return next(new CustomError('Description is required and must be a non-empty string.', 400));
  }

  // Type (Required)
  if (!type || !['NEWS', 'NOTICE'].includes(type)) {
    return next(new CustomError("Type is required and must be either 'NEWS' or 'NOTICE'.", 400));
  }

  // Visibility (Required)
  if (!visibility || !['GROUP', 'CAMPUS'].includes(visibility)) {
    return next(new CustomError("Visibility is required and must be either 'GROUP' or 'CAMPUS'.", 400));
  }

  // Campus mapping validation
  if (visibility === 'CAMPUS') {
    if (!campuses || !Array.isArray(campuses) || campuses.length === 0) {
      return next(new CustomError('At least one campus must be selected when visibility is CAMPUS.', 400));
    }
    for (const campusId of campuses) {
      if (typeof campusId !== 'string' || !isUUID(campusId)) {
        return next(new CustomError(`Invalid campus ID format: "${campusId}". Must be a valid UUID.`, 400));
      }
    }
  }

  // Publish Date (Required)
  if (!publishDate) {
    return next(new CustomError('Publish date is required.', 400));
  }
  const parsedPublishDate = new Date(publishDate);
  if (isNaN(parsedPublishDate.getTime())) {
    return next(new CustomError('Invalid publish date format.', 400));
  }

  // Expiry Date (Optional)
  if (expiryDate !== undefined && expiryDate !== null && expiryDate !== '') {
    const parsedExpiryDate = new Date(expiryDate);
    if (isNaN(parsedExpiryDate.getTime())) {
      return next(new CustomError('Invalid expiry date format.', 400));
    }
    if (parsedExpiryDate <= parsedPublishDate) {
      return next(new CustomError('Expiry date must be after the publish date.', 400));
    }
  }

  // Optional Field: featured
  if (featured !== undefined && typeof featured !== 'boolean') {
    return next(new CustomError('Featured must be a boolean.', 400));
  }

  // Optional Field: priority
  if (priority !== undefined && !['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    return next(new CustomError("Priority must be one of 'HIGH', 'MEDIUM', or 'LOW'.", 400));
  }

  // Optional Field: status
  if (status !== undefined && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    return next(new CustomError("Status must be one of 'DRAFT', 'PUBLISHED', or 'ARCHIVED'.", 400));
  }

  // Optional Fields: meta strings
  if (metaTitle !== undefined && typeof metaTitle !== 'string') {
    return next(new CustomError('Meta title must be a string.', 400));
  }
  if (metaDescription !== undefined && typeof metaDescription !== 'string') {
    return next(new CustomError('Meta description must be a string.', 400));
  }
  if (metaKeywords !== undefined && typeof metaKeywords !== 'string') {
    return next(new CustomError('Meta keywords must be a string.', 400));
  }

  // File Path Validations
  if (!hasValidExtension(thumbnail, THUMBNAIL_EXTENSIONS)) {
    return next(new CustomError(`Thumbnail must have a valid extension: ${THUMBNAIL_EXTENSIONS.join(', ')}`, 400));
  }
  if (!hasValidExtension(attachment, ATTACHMENT_EXTENSIONS)) {
    return next(new CustomError(`Attachment must have a valid extension: ${ATTACHMENT_EXTENSIONS.join(', ')}`, 400));
  }

  next();
};

/**
 * Validate Update NewsNotice payload
 */
export const validateUpdateNewsNotice = (req, res, next) => {
  const {
    title,
    excerpt,
    description,
    type,
    visibility,
    featured,
    priority,
    publishDate,
    expiryDate,
    status,
    campuses,
    metaTitle,
    metaDescription,
    metaKeywords,
    thumbnail,
    attachment
  } = req.body;

  // Since we use PUT for update, we require all critical fields to be present
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Title is required and must be a non-empty string.', 400));
  }

  if (!excerpt || typeof excerpt !== 'string' || excerpt.trim() === '') {
    return next(new CustomError('Excerpt is required and must be a non-empty string.', 400));
  }

  if (!description || typeof description !== 'string' || description.trim() === '') {
    return next(new CustomError('Description is required and must be a non-empty string.', 400));
  }

  if (!type || !['NEWS', 'NOTICE'].includes(type)) {
    return next(new CustomError("Type is required and must be either 'NEWS' or 'NOTICE'.", 400));
  }

  if (!visibility || !['GROUP', 'CAMPUS'].includes(visibility)) {
    return next(new CustomError("Visibility is required and must be either 'GROUP' or 'CAMPUS'.", 400));
  }

  if (visibility === 'CAMPUS') {
    if (!campuses || !Array.isArray(campuses) || campuses.length === 0) {
      return next(new CustomError('At least one campus must be selected when visibility is CAMPUS.', 400));
    }
    for (const campusId of campuses) {
      if (typeof campusId !== 'string' || !isUUID(campusId)) {
        return next(new CustomError(`Invalid campus ID format: "${campusId}". Must be a valid UUID.`, 400));
      }
    }
  }

  if (!publishDate) {
    return next(new CustomError('Publish date is required.', 400));
  }
  const parsedPublishDate = new Date(publishDate);
  if (isNaN(parsedPublishDate.getTime())) {
    return next(new CustomError('Invalid publish date format.', 400));
  }

  if (expiryDate !== undefined && expiryDate !== null && expiryDate !== '') {
    const parsedExpiryDate = new Date(expiryDate);
    if (isNaN(parsedExpiryDate.getTime())) {
      return next(new CustomError('Invalid expiry date format.', 400));
    }
    if (parsedExpiryDate <= parsedPublishDate) {
      return next(new CustomError('Expiry date must be after the publish date.', 400));
    }
  }

  if (featured !== undefined && typeof featured !== 'boolean') {
    return next(new CustomError('Featured must be a boolean.', 400));
  }

  if (priority !== undefined && !['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    return next(new CustomError("Priority must be one of 'HIGH', 'MEDIUM', or 'LOW'.", 400));
  }

  if (status !== undefined && !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    return next(new CustomError("Status must be one of 'DRAFT', 'PUBLISHED', or 'ARCHIVED'.", 400));
  }

  if (metaTitle !== undefined && typeof metaTitle !== 'string') {
    return next(new CustomError('Meta title must be a string.', 400));
  }
  if (metaDescription !== undefined && typeof metaDescription !== 'string') {
    return next(new CustomError('Meta description must be a string.', 400));
  }
  if (metaKeywords !== undefined && typeof metaKeywords !== 'string') {
    return next(new CustomError('Meta keywords must be a string.', 400));
  }

  if (!hasValidExtension(thumbnail, THUMBNAIL_EXTENSIONS)) {
    return next(new CustomError(`Thumbnail must have a valid extension: ${THUMBNAIL_EXTENSIONS.join(', ')}`, 400));
  }
  if (!hasValidExtension(attachment, ATTACHMENT_EXTENSIONS)) {
    return next(new CustomError(`Attachment must have a valid extension: ${ATTACHMENT_EXTENSIONS.join(', ')}`, 400));
  }

  next();
};

/**
 * Validate Update NewsNotice Status payload (PATCH)
 */
export const validateUpdateNewsNoticeStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status || !['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
    return next(new CustomError("Status is required and must be one of 'DRAFT', 'PUBLISHED', or 'ARCHIVED'.", 400));
  }

  next();
};
