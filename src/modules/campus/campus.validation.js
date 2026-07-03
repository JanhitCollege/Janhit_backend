import CustomError from '../../utils/CustomError.js';

// Regex patterns
const SUBDOMAIN_REGEX = /^[a-z0-9-]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const CODE_REGEX = /^[A-Z0-9]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate Create Campus payload
 */
export const validateCreateCampus = (req, res, next) => {
  const {
    name,
    shortName,
    code,
    slug,
    subdomain,
    logo,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    description,
    isActive
  } = req.body;

  // Name (Required)
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return next(new CustomError('Name is required and must be a non-empty string.', 400));
  }

  // Code (Required)
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return next(new CustomError('Code is required and must be a non-empty string.', 400));
  }
  if (!CODE_REGEX.test(code)) {
    return next(new CustomError('Code must be alphanumeric and uppercase (e.g. JCLGN).', 400));
  }

  // Subdomain (Required)
  if (!subdomain || typeof subdomain !== 'string' || subdomain.trim() === '') {
    return next(new CustomError('Subdomain is required and must be a non-empty string.', 400));
  }
  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    return next(new CustomError('Subdomain must contain only lowercase letters, numbers, and hyphens (e.g. "jclgn"). Full domains or URLs are not allowed.', 400));
  }

  // Slug (Optional)
  if (slug !== undefined) {
    if (typeof slug !== 'string' || slug.trim() === '') {
      return next(new CustomError('Slug must be a non-empty string if provided.', 400));
    }
    if (!SLUG_REGEX.test(slug)) {
      return next(new CustomError('Slug must contain only lowercase letters, numbers, and hyphens.', 400));
    }
  }

  // Optional string fields type validation
  if (shortName !== undefined && (typeof shortName !== 'string' || shortName.trim() === '')) {
    return next(new CustomError('Short name must be a non-empty string.', 400));
  }
  if (logo !== undefined && typeof logo !== 'string') {
    return next(new CustomError('Logo must be a string.', 400));
  }
  if (phone !== undefined && typeof phone !== 'string') {
    return next(new CustomError('Phone must be a string.', 400));
  }
  if (address !== undefined && typeof address !== 'string') {
    return next(new CustomError('Address must be a string.', 400));
  }
  if (city !== undefined && typeof city !== 'string') {
    return next(new CustomError('City must be a string.', 400));
  }
  if (state !== undefined && typeof state !== 'string') {
    return next(new CustomError('State must be a string.', 400));
  }
  if (pincode !== undefined && typeof pincode !== 'string') {
    return next(new CustomError('Pincode must be a string.', 400));
  }
  if (description !== undefined && typeof description !== 'string') {
    return next(new CustomError('Description must be a string.', 400));
  }

  // Email validation (Optional)
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_REGEX.test(email)) {
      return next(new CustomError('Please provide a valid email address.', 400));
    }
  }

  // isActive validation (Optional)
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return next(new CustomError('isActive must be a boolean.', 400));
  }

  next();
};

/**
 * Validate Update Campus payload (PUT)
 */
export const validateUpdateCampus = (req, res, next) => {
  const {
    name,
    shortName,
    code,
    slug,
    subdomain,
    logo,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    description,
    isActive
  } = req.body;

  // For PUT, require core fields
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return next(new CustomError('Name is required and must be a non-empty string.', 400));
  }

  if (!code || typeof code !== 'string' || code.trim() === '') {
    return next(new CustomError('Code is required and must be a non-empty string.', 400));
  }
  if (!CODE_REGEX.test(code)) {
    return next(new CustomError('Code must be alphanumeric and uppercase (e.g. JCLGN).', 400));
  }

  if (!subdomain || typeof subdomain !== 'string' || subdomain.trim() === '') {
    return next(new CustomError('Subdomain is required and must be a non-empty string.', 400));
  }
  if (!SUBDOMAIN_REGEX.test(subdomain)) {
    return next(new CustomError('Subdomain must contain only lowercase letters, numbers, and hyphens (e.g. "jclgn"). Full domains or URLs are not allowed.', 400));
  }

  if (slug !== undefined) {
    if (typeof slug !== 'string' || slug.trim() === '') {
      return next(new CustomError('Slug must be a non-empty string if provided.', 400));
    }
    if (!SLUG_REGEX.test(slug)) {
      return next(new CustomError('Slug must contain only lowercase letters, numbers, and hyphens.', 400));
    }
  }

  // Optional string fields type validation
  if (shortName !== undefined && (typeof shortName !== 'string' || shortName.trim() === '')) {
    return next(new CustomError('Short name must be a non-empty string.', 400));
  }
  if (logo !== undefined && typeof logo !== 'string') {
    return next(new CustomError('Logo must be a string.', 400));
  }
  if (phone !== undefined && typeof phone !== 'string') {
    return next(new CustomError('Phone must be a string.', 400));
  }
  if (address !== undefined && typeof address !== 'string') {
    return next(new CustomError('Address must be a string.', 400));
  }
  if (city !== undefined && typeof city !== 'string') {
    return next(new CustomError('City must be a string.', 400));
  }
  if (state !== undefined && typeof state !== 'string') {
    return next(new CustomError('State must be a string.', 400));
  }
  if (pincode !== undefined && typeof pincode !== 'string') {
    return next(new CustomError('Pincode must be a string.', 400));
  }
  if (description !== undefined && typeof description !== 'string') {
    return next(new CustomError('Description must be a string.', 400));
  }

  // Email validation (Optional)
  if (email !== undefined && email !== null && email !== '') {
    if (!EMAIL_REGEX.test(email)) {
      return next(new CustomError('Please provide a valid email address.', 400));
    }
  }

  // isActive validation (Optional)
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return next(new CustomError('isActive must be a boolean.', 400));
  }

  next();
};

/**
 * Validate Update Campus Status payload (PATCH)
 */
export const validateUpdateCampusStatus = (req, res, next) => {
  const { isActive } = req.body;

  if (isActive === undefined || typeof isActive !== 'boolean') {
    return next(new CustomError('isActive is required and must be a boolean.', 400));
  }

  next();
};
