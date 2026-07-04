import CustomError from '../../utils/CustomError.js';

// Regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/; // 10 digits

/**
 * Validate Create Admission Lead payload
 */
export const validateCreateAdmissionLead = (req, res, next) => {
  const { name, email, mobile, course, campusId } = req.body;

  // Name (Required)
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return next(new CustomError('Name is required and must be a non-empty string.', 400));
  }

  // Email (Required)
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return next(new CustomError('Email is required and must be a non-empty string.', 400));
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return next(new CustomError('Please provide a valid email address.', 400));
  }

  // Mobile (Required)
  if (!mobile || typeof mobile !== 'string' || mobile.trim() === '') {
    return next(new CustomError('Mobile number is required and must be a non-empty string.', 400));
  }
  if (!MOBILE_REGEX.test(mobile.trim())) {
    return next(new CustomError('Mobile number must be exactly 10 digits.', 400));
  }

  // Course (Required)
  if (!course || typeof course !== 'string' || course.trim() === '') {
    return next(new CustomError('Course is required and must be a non-empty string.', 400));
  }

  // CampusId (Required)
  if (!campusId || typeof campusId !== 'string' || campusId.trim() === '') {
    return next(new CustomError('Campus ID is required and must be a non-empty string.', 400));
  }

  next();
};

/**
 * Validate Update Admission Lead Status payload
 */
export const validateUpdateAdmissionLeadStatus = (req, res, next) => {
  const { status } = req.body;
  const ALLOWED_STATUSES = ['NEW', 'CONTACTED', 'ADMISSION_DONE', 'CLOSED'];

  if (!status || typeof status !== 'string' || status.trim() === '') {
    return next(new CustomError('Status is required and must be a non-empty string.', 400));
  }

  const normalizedStatus = status.trim().toUpperCase();
  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return next(
      new CustomError(
        `Invalid status. Allowed values are: ${ALLOWED_STATUSES.join(', ')}`,
        400
      )
    );
  }

  // Update status with the normalized one
  req.body.status = normalizedStatus;
  next();
};
