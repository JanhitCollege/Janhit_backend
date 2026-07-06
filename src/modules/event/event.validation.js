import CustomError from '../../utils/CustomError.js';

const ALLOWED_STATUS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

/**
 * Helper to validate UUID format
 */
const isUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Validate Create Event payload
 */
export const validateCreateEvent = (req, res, next) => {
  const {
    title,
    startDate,
    endDate,
    isMainWebsite,
    status,
    campuses
  } = req.body;

  // Title (Required)
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new CustomError('Title is required and must be a non-empty string.', 400));
  }

  // Start Date (Required)
  if (!startDate) {
    return next(new CustomError('Start date is required.', 400));
  }
  const parsedStartDate = new Date(startDate);
  if (isNaN(parsedStartDate.getTime())) {
    return next(new CustomError('Invalid start date format.', 400));
  }

  // End Date (Optional)
  if (endDate !== undefined && endDate !== null && endDate !== '' && endDate !== 'null') {
    const parsedEndDate = new Date(endDate);
    if (isNaN(parsedEndDate.getTime())) {
      return next(new CustomError('Invalid end date format.', 400));
    }
    if (parsedEndDate < parsedStartDate) {
      return next(new CustomError('End date must be on or after the start date.', 400));
    }
  }

  // Status (Optional)
  if (status !== undefined) {
    if (!ALLOWED_STATUS.includes(status)) {
      return next(new CustomError(`Invalid status. Allowed values: ${ALLOWED_STATUS.join(', ')}`, 400));
    }
  }

  // isMainWebsite (Optional)
  if (isMainWebsite !== undefined) {
    const isBool = typeof isMainWebsite === 'boolean' || isMainWebsite === 'true' || isMainWebsite === 'false';
    if (!isBool) {
      return next(new CustomError('isMainWebsite must be a boolean.', 400));
    }
  }

  // Campuses (Optional)
  if (campuses !== undefined) {
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

/**
 * Validate Update Event payload
 */
export const validateUpdateEvent = (req, res, next) => {
  const {
    title,
    startDate,
    endDate,
    isMainWebsite,
    status,
    campuses
  } = req.body;

  let parsedStartDate = null;

  // Title (Optional)
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return next(new CustomError('Title cannot be empty.', 400));
    }
  }

  // Start Date (Optional)
  if (startDate !== undefined && startDate !== null) {
    parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return next(new CustomError('Invalid start date format.', 400));
    }
  }

  // End Date (Optional)
  if (endDate !== undefined && endDate !== null && endDate !== '' && endDate !== 'null') {
    const parsedEndDate = new Date(endDate);
    if (isNaN(parsedEndDate.getTime())) {
      return next(new CustomError('Invalid end date format.', 400));
    }

    // Compare if start date is available (either passed or to be handled)
    if (parsedStartDate) {
      if (parsedEndDate < parsedStartDate) {
        return next(new CustomError('End date must be on or after the start date.', 400));
      }
    }
  }

  // Status (Optional)
  if (status !== undefined) {
    if (!ALLOWED_STATUS.includes(status)) {
      return next(new CustomError(`Invalid status. Allowed values: ${ALLOWED_STATUS.join(', ')}`, 400));
    }
  }

  // isMainWebsite (Optional)
  if (isMainWebsite !== undefined) {
    const isBool = typeof isMainWebsite === 'boolean' || isMainWebsite === 'true' || isMainWebsite === 'false';
    if (!isBool) {
      return next(new CustomError('isMainWebsite must be a boolean.', 400));
    }
  }

  // Campuses (Optional)
  if (campuses !== undefined) {
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
