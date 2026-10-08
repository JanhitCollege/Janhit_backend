import CustomError from '../../utils/CustomError.js';

const VALID_DOC_CATEGORIES = ['B_DOCUMENTS', 'C_ACADEMICS'];
const VALID_DETAIL_SECTIONS = ['A_GENERAL_INFO', 'D_STAFF', 'E_INFRASTRUCTURE'];

export const validateCreateDocument = (req, res, next) => {
  const { title, doc_number, category_code } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Title is required.', 400));
  }

  if (!doc_number || typeof doc_number !== 'string' || doc_number.trim() === '') {
    return next(new CustomError('Document number (doc_number) is required.', 400));
  }

  if (!category_code || !VALID_DOC_CATEGORIES.includes(category_code)) {
    return next(new CustomError(`Invalid category_code. Must be one of: ${VALID_DOC_CATEGORIES.join(', ')}`, 400));
  }

  next();
};

export const validateUpdateDocument = (req, res, next) => {
  const { category_code, is_active } = req.body;

  if (category_code && !VALID_DOC_CATEGORIES.includes(category_code)) {
    return next(new CustomError(`Invalid category_code. Must be one of: ${VALID_DOC_CATEGORIES.join(', ')}`, 400));
  }

  if (is_active !== undefined && typeof is_active !== 'boolean' && is_active !== 'true' && is_active !== 'false') {
    return next(new CustomError('is_active must be a boolean value.', 400));
  }

  next();
};

export const validateBulkUpdateDetails = (req, res, next) => {
  const { details, generalInfo, staffMetrics, teacherRoster, infrastructure } = req.body;

  // Allow either flat details array OR structured section objects
  const hasStructured = generalInfo || staffMetrics || teacherRoster || infrastructure;
  const hasDetails = details && Array.isArray(details) && details.length > 0;

  if (!hasStructured && !hasDetails) {
    return next(new CustomError('Payload must contain either a "details" array or structured section fields (generalInfo, staffMetrics, teacherRoster, infrastructure).', 400));
  }

  if (hasDetails) {
    for (let i = 0; i < details.length; i++) {
      const item = details[i];
      if (!item.section_code || !VALID_DETAIL_SECTIONS.includes(item.section_code)) {
        return next(new CustomError(`Invalid section_code at index ${i}. Must be one of: ${VALID_DETAIL_SECTIONS.join(', ')}`, 400));
      }

      if (!item.metric_key || typeof item.metric_key !== 'string' || item.metric_key.trim() === '') {
        return next(new CustomError(`metric_key is required at index ${i}.`, 400));
      }

      if (item.metric_value === undefined || item.metric_value === null) {
        return next(new CustomError(`metric_value is required at index ${i}.`, 400));
      }
    }
  }

  next();
};

export const validateBatchUpdate = (req, res, next) => {
  const { campusIds } = req.body;

  if (!campusIds || !Array.isArray(campusIds) || campusIds.length === 0) {
    return next(new CustomError('Payload must contain a non-empty "campusIds" array.', 400));
  }

  return validateBulkUpdateDetails(req, res, next);
};
