import CustomError from '../../utils/CustomError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate Upload Payload
 */
export const validateUploadPayload = (req, res, next) => {
  const { campusId, mediaType, title, description, category, sortOrder, isActive } = req.body;

  // 1. Check file exists (Multer puts it in req.file)
  if (!req.file) {
    return next(new CustomError('File upload is required.', 400));
  }

  // 2. Validate campusId (Required)
  if (!campusId) {
    return next(new CustomError('campusId is required.', 400));
  }
  if (typeof campusId !== 'string' || !UUID_REGEX.test(campusId)) {
    return next(new CustomError('campusId must be a valid UUID.', 400));
  }

  // 3. Validate mediaType (Required)
  if (!mediaType) {
    return next(new CustomError('mediaType is required.', 400));
  }
  if (mediaType !== 'IMAGE' && mediaType !== 'VIDEO') {
    return next(new CustomError('mediaType must be either IMAGE or VIDEO.', 400));
  }

  // 4. Validate string types (Optional)
  const stringFields = { title, description, category };
  for (const [key, value] of Object.entries(stringFields)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string') {
        return next(new CustomError(`${key} must be a string.`, 400));
      }
    }
  }

  // 5. Validate sortOrder (Optional)
  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    const parsedOrder = Number(sortOrder);
    if (isNaN(parsedOrder) || !Number.isInteger(parsedOrder)) {
      return next(new CustomError('sortOrder must be an integer.', 400));
    }
    req.body.sortOrder = parsedOrder;
  } else {
    req.body.sortOrder = 0; // Default
  }

  // 6. Validate isActive (Optional)
  if (isActive !== undefined && isActive !== null && isActive !== '') {
    if (isActive === 'true' || isActive === true) {
      req.body.isActive = true;
    } else if (isActive === 'false' || isActive === false) {
      req.body.isActive = false;
    } else {
      return next(new CustomError('isActive must be a boolean.', 400));
    }
  } else {
    req.body.isActive = true; // Default
  }

  next();
};

/**
 * Validate Update Payload
 */
export const validateUpdatePayload = (req, res, next) => {
  const { title, description, category, sortOrder, isActive } = req.body;

  // 1. Validate string types (Optional)
  const stringFields = { title, description, category };
  for (const [key, value] of Object.entries(stringFields)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value !== 'string') {
        return next(new CustomError(`${key} must be a string.`, 400));
      }
    }
  }

  // 2. Validate sortOrder (Optional)
  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    const parsedOrder = Number(sortOrder);
    if (isNaN(parsedOrder) || !Number.isInteger(parsedOrder)) {
      return next(new CustomError('sortOrder must be an integer.', 400));
    }
    req.body.sortOrder = parsedOrder;
  }

  // 3. Validate isActive (Optional)
  if (isActive !== undefined && isActive !== null && isActive !== '') {
    if (isActive === 'true' || isActive === true) {
      req.body.isActive = true;
    } else if (isActive === 'false' || isActive === false) {
      req.body.isActive = false;
    } else {
      return next(new CustomError('isActive must be a boolean.', 400));
    }
  }

  next();
};

/**
 * Validate Update Status Payload
 */
export const validateUpdateStatus = (req, res, next) => {
  const { isActive } = req.body;

  if (isActive === undefined || isActive === null || isActive === '') {
    return next(new CustomError('isActive is required.', 400));
  }

  if (isActive === 'true' || isActive === true) {
    req.body.isActive = true;
  } else if (isActive === 'false' || isActive === false) {
    req.body.isActive = false;
  } else {
    return next(new CustomError('isActive must be a boolean.', 400));
  }

  next();
};
