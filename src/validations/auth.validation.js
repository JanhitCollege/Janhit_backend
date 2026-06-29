import CustomError from '../utils/CustomError.js';

// Reusable regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/; // Standard 10-digit Indian mobile number check

export const validateSignup = (req, res, next) => {
  const { name, email, mobile, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return next(new CustomError('Name is required and must be a string.', 400));
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return next(new CustomError('Please provide a valid email address.', 400));
  }

  if (!mobile || !MOBILE_REGEX.test(mobile)) {
    return next(new CustomError('Please provide a valid 10-digit mobile number starting with 6-9.', 400));
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return next(new CustomError('Password is required and must be at least 6 characters long.', 400));
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return next(new CustomError('Please provide a valid email address.', 400));
  }

  if (!password || typeof password !== 'string' || password.trim() === '') {
    return next(new CustomError('Password is required.', 400));
  }

  next();
};

export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return next(new CustomError('Please provide a valid email address.', 400));
  }

  next();
};

export const validateResetPassword = (req, res, next) => {
  const { token, password } = req.body;

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return next(new CustomError('Reset token is required.', 400));
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return next(new CustomError('New password is required and must be at least 6 characters long.', 400));
  }

  next();
};

export const validateChangePassword = (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || typeof oldPassword !== 'string' || oldPassword.trim() === '') {
    return next(new CustomError('Old password is required.', 400));
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return next(new CustomError('New password is required and must be at least 6 characters long.', 400));
  }

  if (oldPassword === newPassword) {
    return next(new CustomError('New password cannot be the same as the old password.', 400));
  }

  next();
};
