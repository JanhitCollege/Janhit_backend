import CustomError from '../../utils/CustomError.js';

const VALID_DOC_CATEGORIES = ['B_DOCUMENTS', 'C_ACADEMICS'];
const VALID_SECTIONS = ['A_GENERAL_INFO', 'B_DOCUMENTS', 'C_ACADEMICS', 'D_STAFF', 'E_INFRASTRUCTURE'];
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
  const { title, doc_number, category_code, is_active } = req.body;

  if (category_code && !VALID_DOC_CATEGORIES.includes(category_code)) {
    return next(new CustomError(`Invalid category_code. Must be one of: ${VALID_DOC_CATEGORIES.join(', ')}`, 400));
  }

  if (is_active !== undefined && typeof is_active !== 'boolean' && is_active !== 'true' && is_active !== 'false') {
    return next(new CustomError('is_active must be a boolean value.', 400));
  }

  next();
};

export const validateBulkUpdateDetails = (req, res, next) => {
  const { details } = req.body;

  if (!details || !Array.isArray(details) || details.length === 0) {
    return next(new CustomError('Payload must contain a non-empty "details" array.', 400));
  }

  for (let i = 0; i < details.length; i++) {
    const item = details[i];
    if (!item.section_code || !VALID_DETAIL_SECTIONS.includes(item.section_code)) {
      return next(new CustomError(`Invalid section_code at index ${i}. Must be one of: ${VALID_DETAIL_SECTIONS.join(', ')}`, 400));
    }

    if (!item.metric_key || typeof item.metric_key !== 'string' || item.metric_key.trim() === '') {
      return next(new CustomError(`metric_key is required at index ${i}.`, 400));
    }

    if (!item.metric_label || typeof item.metric_label !== 'string' || item.metric_label.trim() === '') {
      return next(new CustomError(`metric_label is required at index ${i}.`, 400));
    }

    if (item.metric_value === undefined || item.metric_value === null) {
      return next(new CustomError(`metric_value is required at index ${i}.`, 400));
    }
  }

  next();
};
