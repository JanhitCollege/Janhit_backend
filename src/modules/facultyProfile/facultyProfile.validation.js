import CustomError from '../../utils/CustomError.js';

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate Create/Update Faculty Profile payload
 */
export const validateFacultyProfilePayload = (req, res, next) => {
  const {
    campusId,
    image,
    name,
    designation,
    department,
    qualification,
    specialization,
    experience,
    email,
    phone,
    linkedin,
    researchInterest,
    subjects,
    publications,
    awards,
    bio,
    message,
    displayOrder,
    isHod,
    isFeatured,
    isActive
  } = req.body;

  // UUID type validation for campusId
  if (campusId !== undefined && campusId !== null && campusId !== '') {
    if (typeof campusId !== 'string' || !UUID_REGEX.test(campusId)) {
      return next(new CustomError('campusId must be a valid UUID.', 400));
    }
  }

  // String fields type validation
  const stringFields = {
    image,
    name,
    designation,
    department,
    qualification,
    specialization,
    experience,
    phone,
    linkedin,
    researchInterest,
    subjects,
    publications,
    awards,
    bio,
    message
  };

  for (const [key, value] of Object.entries(stringFields)) {
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        return next(new CustomError(`${key} must be a string.`, 400));
      }
    }
  }

  // Email format validation (Optional)
  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return next(new CustomError('Please provide a valid email address.', 400));
    }
  }

  // Number fields type validation
  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== '') {
    const parsedOrder = Number(displayOrder);
    if (isNaN(parsedOrder) || !Number.isInteger(parsedOrder)) {
      return next(new CustomError('displayOrder must be an integer.', 400));
    }
    // Set parsed integer value on body
    req.body.displayOrder = parsedOrder;
  }

  // Boolean fields type validation
  const booleanFields = { isHod, isFeatured, isActive };
  for (const [key, value] of Object.entries(booleanFields)) {
    if (value !== undefined && value !== null && value !== '') {
      // Handle stringified booleans if multipart/form-data sends them as strings
      if (value === 'true' || value === true) {
        req.body[key] = true;
      } else if (value === 'false' || value === false) {
        req.body[key] = false;
      } else {
        return next(new CustomError(`${key} must be a boolean.`, 400));
      }
    }
  }

  next();
};

/**
 * Validate Update Status payload
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
