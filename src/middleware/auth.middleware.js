import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import CustomError from '../utils/CustomError.js';
import logger from '../utils/logger.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Read token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new CustomError('You are not logged in. Please log in to get access.', 401));
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      logger.error('Access token verification failed:', err);
      if (err.name === 'TokenExpiredError') {
        return next(new CustomError('Your session has expired. Please refresh your token.', 401));
      }
      return next(new CustomError('Invalid session token. Please login again.', 401));
    }

    // 3. Find user in the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return next(new CustomError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new CustomError('Your account has been deactivated. Please contact support.', 403));
    }

    // 4. Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new CustomError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
