import CustomError from '../../utils/CustomError.js';

// Standard email validation pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Standard 10-digit mobile validation pattern
const PHONE_REGEX = /^\d{10}$/;

/**
 * Validates request payload for POST /api/enquiries.
 * Enforces existence of fields required by the AdmissionLead database model.
 */
export const validateEnquiry = (req, res, next) => {
  // 1. Block any recipient-selection injection fields
  const forbiddenFields = ['to', 'recipient', 'recipientemail', 'mailto', 'emailto'];
  const bodyKeys = Object.keys(req.body).map(k => k.toLowerCase());
  const containsForbidden = bodyKeys.some(k => forbiddenFields.includes(k));
  if (containsForbidden) {
    return next(new CustomError('Recipient selection fields are not allowed.', 400));
  }

  // 2. Trim string inputs and handle empty strings appropriately
  for (const key of Object.keys(req.body)) {
    const value = req.body[key];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        return next(new CustomError(`Field '${key}' must be a string value.`, 400));
      }
      const trimmed = value.trim();
      if (trimmed === '') {
        delete req.body[key];
      } else {
        req.body[key] = trimmed;
      }
    }
  }

  const { name, parentName, email, phone, mobile, alternateMobile, course, grade } = req.body;

  // 3. Ensure at least one name field is provided (required for lead creation)
  if (!name && !parentName) {
    return next(
      new CustomError('Name is required (must provide either name or parentName).', 400)
    );
  }

  // 4. Ensure email is provided and matches pattern (required for lead creation)
  if (!email) {
    return next(new CustomError('Email is required.', 400));
  }
  if (!EMAIL_REGEX.test(email)) {
    return next(new CustomError('Please provide a valid email address.', 400));
  }

  // 5. Ensure primary phone is provided and matches pattern (required for lead creation)
  if (!mobile && !phone) {
    return next(
      new CustomError('Phone number is required (must provide either mobile or phone).', 400)
    );
  }
  
  const primaryPhone = mobile || phone;
  if (!PHONE_REGEX.test(primaryPhone)) {
    return next(new CustomError('Phone number must be exactly 10 digits.', 400));
  }

  // 6. Ensure course/academic interest is provided (required for lead creation)
  if (!course && !grade) {
    return next(
      new CustomError('Course or Grade is required (must provide either course or grade).', 400)
    );
  }

  // 7. Validate other fields if they are explicitly provided
  if (alternateMobile && !PHONE_REGEX.test(alternateMobile)) {
    return next(new CustomError('Alternate mobile number must be exactly 10 digits.', 400));
  }

  next();
};
