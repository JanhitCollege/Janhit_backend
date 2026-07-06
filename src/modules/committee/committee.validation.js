import CustomError from '../../utils/CustomError.js';

const ALLOWED_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const ALLOWED_DOCUMENT_TYPES = ['ORDER', 'NOTICE', 'MINUTES', 'REPORT', 'CIRCULAR', 'OTHER'];

const isUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const isValidDate = (val) => {
  if (!val) return false;
  const date = new Date(val);
  return !isNaN(date.getTime());
};

const isBoolean = (val) => {
  return typeof val === 'boolean' || val === 'true' || val === 'false';
};

const isInteger = (val) => {
  const num = Number(val);
  return Number.isInteger(num);
};

export const validateCreateCommittee = (req, res, next) => {
  const {
    title,
    category,
    status,
    publishDate,
    displayOrder,
    isMainWebsite,
    campuses,
    tenureFrom,
    tenureTo,
    academicSession
  } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Title is required and must be a non-empty string.', 400));
  }

  if (category !== undefined && category !== null && category !== '') {
    if (typeof category !== 'string') {
      return next(new CustomError('Category must be a string.', 400));
    }
    const trimmed = category.trim();
    if (trimmed === '') {
      return next(new CustomError('Category cannot be empty.', 400));
    }
    if (trimmed.length > 100) {
      return next(new CustomError('Category cannot exceed 100 characters.', 400));
    }
    req.body.category = trimmed;
  }

  if (status !== undefined && status !== null && status !== '') {
    if (!ALLOWED_STATUSES.includes(status)) {
      return next(new CustomError(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`, 400));
    }
  }

  if (publishDate !== undefined && publishDate !== null && publishDate !== '' && publishDate !== 'null') {
    if (!isValidDate(publishDate)) {
      return next(new CustomError('Invalid publishDate format.', 400));
    }
  }

  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
    if (!isInteger(displayOrder)) {
      return next(new CustomError('displayOrder must be an integer.', 400));
    }
  }

  if (isMainWebsite !== undefined && isMainWebsite !== null && isMainWebsite !== '') {
    if (!isBoolean(isMainWebsite)) {
      return next(new CustomError('isMainWebsite must be a boolean.', 400));
    }
  }

  if (tenureFrom !== undefined && tenureFrom !== null && tenureFrom !== '' && tenureFrom !== 'null') {
    if (!isValidDate(tenureFrom)) {
      return next(new CustomError('Invalid tenureFrom date format.', 400));
    }
  }

  if (tenureTo !== undefined && tenureTo !== null && tenureTo !== '' && tenureTo !== 'null') {
    if (!isValidDate(tenureTo)) {
      return next(new CustomError('Invalid tenureTo date format.', 400));
    }
    if (tenureFrom && isValidDate(tenureFrom) && new Date(tenureTo) < new Date(tenureFrom)) {
      return next(new CustomError('tenureTo must be on or after tenureFrom.', 400));
    }
  }

  if (campuses !== undefined && campuses !== null && campuses !== '') {
    let campusList = campuses;
    if (typeof campuses === 'string') {
      try {
        campusList = JSON.parse(campuses);
      } catch (err) {
        campusList = campuses.split(',').map(id => id.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(campusList)) {
      return next(new CustomError('Campuses must be an array of UUIDs.', 400));
    }
    for (const id of campusList) {
      if (!isUUID(id)) {
        return next(new CustomError(`Invalid campus ID format: "${id}". Must be a valid UUID.`, 400));
      }
    }
  }

  next();
};

export const validateUpdateCommittee = (req, res, next) => {
  const {
    title,
    category,
    status,
    publishDate,
    displayOrder,
    isMainWebsite,
    campuses,
    tenureFrom,
    tenureTo,
    academicSession
  } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return next(new CustomError('Title cannot be empty.', 400));
    }
  }

  if (category !== undefined && category !== null && category !== '') {
    if (typeof category !== 'string') {
      return next(new CustomError('Category must be a string.', 400));
    }
    const trimmed = category.trim();
    if (trimmed === '') {
      return next(new CustomError('Category cannot be empty.', 400));
    }
    if (trimmed.length > 100) {
      return next(new CustomError('Category cannot exceed 100 characters.', 400));
    }
    req.body.category = trimmed;
  }

  if (status !== undefined && status !== null && status !== '') {
    if (!ALLOWED_STATUSES.includes(status)) {
      return next(new CustomError(`Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`, 400));
    }
  }

  if (publishDate !== undefined && publishDate !== null && publishDate !== '' && publishDate !== 'null') {
    if (!isValidDate(publishDate)) {
      return next(new CustomError('Invalid publishDate format.', 400));
    }
  }

  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
    if (!isInteger(displayOrder)) {
      return next(new CustomError('displayOrder must be an integer.', 400));
    }
  }

  if (isMainWebsite !== undefined && isMainWebsite !== null && isMainWebsite !== '') {
    if (!isBoolean(isMainWebsite)) {
      return next(new CustomError('isMainWebsite must be a boolean.', 400));
    }
  }

  if (tenureFrom !== undefined && tenureFrom !== null && tenureFrom !== '' && tenureFrom !== 'null') {
    if (!isValidDate(tenureFrom)) {
      return next(new CustomError('Invalid tenureFrom date format.', 400));
    }
  }

  if (tenureTo !== undefined && tenureTo !== null && tenureTo !== '' && tenureTo !== 'null') {
    if (!isValidDate(tenureTo)) {
      return next(new CustomError('Invalid tenureTo date format.', 400));
    }
    if (tenureFrom && isValidDate(tenureFrom) && new Date(tenureTo) < new Date(tenureFrom)) {
      return next(new CustomError('tenureTo must be on or after tenureFrom.', 400));
    }
  }

  if (campuses !== undefined && campuses !== null && campuses !== '') {
    let campusList = campuses;
    if (typeof campuses === 'string') {
      try {
        campusList = JSON.parse(campuses);
      } catch (err) {
        campusList = campuses.split(',').map(id => id.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(campusList)) {
      return next(new CustomError('Campuses must be an array of UUIDs.', 400));
    }
    for (const id of campusList) {
      if (!isUUID(id)) {
        return next(new CustomError(`Invalid campus ID format: "${id}". Must be a valid UUID.`, 400));
      }
    }
  }

  next();
};

export const validateCreateMember = (req, res, next) => {
  const { name, committeeRole, displayOrder, isActive, tenureFrom, tenureTo } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return next(new CustomError('Member name is required.', 400));
  }

  if (!committeeRole || typeof committeeRole !== 'string' || committeeRole.trim() === '') {
    return next(new CustomError('Committee role is required.', 400));
  }

  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
    if (!isInteger(displayOrder)) {
      return next(new CustomError('displayOrder must be an integer.', 400));
    }
  }

  if (isActive !== undefined && isActive !== null && isActive !== '') {
    if (!isBoolean(isActive)) {
      return next(new CustomError('isActive must be a boolean.', 400));
    }
  }

  if (tenureFrom !== undefined && tenureFrom !== null && tenureFrom !== '' && tenureFrom !== 'null') {
    if (!isValidDate(tenureFrom)) {
      return next(new CustomError('Invalid tenureFrom date format.', 400));
    }
  }

  if (tenureTo !== undefined && tenureTo !== null && tenureTo !== '' && tenureTo !== 'null') {
    if (!isValidDate(tenureTo)) {
      return next(new CustomError('Invalid tenureTo date format.', 400));
    }
    if (tenureFrom && isValidDate(tenureFrom) && new Date(tenureTo) < new Date(tenureFrom)) {
      return next(new CustomError('tenureTo must be on or after tenureFrom.', 400));
    }
  }

  next();
};

export const validateUpdateMember = (req, res, next) => {
  const { name, committeeRole, displayOrder, isActive, tenureFrom, tenureTo } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return next(new CustomError('Member name cannot be empty.', 400));
    }
  }

  if (committeeRole !== undefined) {
    if (typeof committeeRole !== 'string' || committeeRole.trim() === '') {
      return next(new CustomError('Committee role cannot be empty.', 400));
    }
  }

  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
    if (!isInteger(displayOrder)) {
      return next(new CustomError('displayOrder must be an integer.', 400));
    }
  }

  if (isActive !== undefined && isActive !== null && isActive !== '') {
    if (!isBoolean(isActive)) {
      return next(new CustomError('isActive must be a boolean.', 400));
    }
  }

  if (tenureFrom !== undefined && tenureFrom !== null && tenureFrom !== '' && tenureFrom !== 'null') {
    if (!isValidDate(tenureFrom)) {
      return next(new CustomError('Invalid tenureFrom date format.', 400));
    }
  }

  if (tenureTo !== undefined && tenureTo !== null && tenureTo !== '' && tenureTo !== 'null') {
    if (!isValidDate(tenureTo)) {
      return next(new CustomError('Invalid tenureTo date format.', 400));
    }
    if (tenureFrom && isValidDate(tenureFrom) && new Date(tenureTo) < new Date(tenureFrom)) {
      return next(new CustomError('tenureTo must be on or after tenureFrom.', 400));
    }
  }

  next();
};

export const validateCreateDocument = (req, res, next) => {
  const { title, documentType, displayOrder } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Document title is required.', 400));
  }

  if (documentType !== undefined && documentType !== null && documentType !== '') {
    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return next(new CustomError(`Invalid documentType. Allowed values: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`, 400));
    }
  }

  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
    if (!isInteger(displayOrder)) {
      return next(new CustomError('displayOrder must be an integer.', 400));
    }
  }

  if (!req.file) {
    return next(new CustomError('Document file upload is required.', 400));
  }

  next();
};
