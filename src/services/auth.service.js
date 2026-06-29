import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import CustomError from '../utils/CustomError.js';
import { sendEmail } from './email.service.js';
import logger from '../utils/logger.js';

// Token generation helpers
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15d' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '30d' }
  );
};

export const signupService = async (userData) => {
  const { name, email, mobile, password } = userData;

  // 1. Check if any user exists in the database
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw new CustomError('Admin already exists. Signup has been disabled.', 403);
  }

  // 2. Check if email or mobile is already registered (safety checks)
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new CustomError('Email is already registered.', 400);
  }

  const existingMobile = await prisma.user.findUnique({ where: { mobile } });
  if (existingMobile) {
    throw new CustomError('Mobile number is already registered.', 400);
  }

  // 3. Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 4. Create the first admin user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      mobile,
      password: hashedPassword,
      role: 'ADMIN', // Force ADMIN role for the first user
      isActive: true,
    },
  });

  // Omit password from output
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

export const loginService = async (credentials) => {
  const { email, password } = credentials;

  // 1. Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new CustomError('Invalid email or password.', 401);
  }

  // 2. Check if user is active
  if (!user.isActive) {
    throw new CustomError('Your account has been deactivated. Please contact support.', 403);
  }

  // 3. Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new CustomError('Invalid email or password.', 401);
  }

  // 4. Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // 5. Save refresh token in database (optionally hashed, here stored securely)
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Omit password and refresh token from the user object returned
  const { password: _, refreshToken: __, ...userWithoutSensitiveDetails } = user;

  return {
    user: userWithoutSensitiveDetails,
    accessToken,
    refreshToken,
  };
};

export const logoutService = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

export const forgotPasswordService = async (email) => {
  // 1. Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return standard response even if user doesn't exist to prevent email enumeration attacks
    // But log it internally
    logger.info(`Forgot password requested for non-existent email: ${email}`);
    return;
  }

  // 2. Generate a random reset token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 3. Hash the token and set expiration (10 minutes)
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expireTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // 4. Save to db
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: expireTime,
    },
  });

  // 5. Send email
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const message = `You are receiving this email because you (or someone else) requested a password reset. 
Please make a POST request with the token and your new password or click the link below:

Link: ${resetUrl}

Token: ${resetToken}

This link is valid for 10 minutes. If you did not request this, please ignore this email.`;

  const html = `
    <h3>Password Reset Request</h3>
    <p>You requested a password reset for your Janhit account.</p>
    <p>Click the link below or copy the token to reset your password. This link is valid for 10 minutes.</p>
    <p><a href="${resetUrl}" target="_blank" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
    <p><strong>Reset Token:</strong> <code>${resetToken}</code></p>
    <p>If you did not request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Janhit Account - Password Reset Request',
      text: message,
      html,
    });
  } catch (error) {
    // If mail sending fails, reset database columns so token is not valid
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });
    throw new CustomError('Failed to send reset email. Please try again later.', 500);
  }
};

export const resetPasswordService = async (token, newPassword) => {
  // 1. Hash the incoming token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // 2. Find user by token and check expiry
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpire: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new CustomError('Invalid or expired reset token.', 400);
  }

  // 3. Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // 4. Update password and clear reset token details and old refresh tokens
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpire: null,
      refreshToken: null, // Revoke active sessions for security
    },
  });
};

export const changePasswordService = async (userId, oldPassword, newPassword) => {
  // 1. Get user details including password
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new CustomError('User not found.', 404);
  }

  // 2. Validate old password
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new CustomError('Current password is incorrect.', 400);
  }

  // 3. Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // 4. Update password and invalidate current refresh tokens
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      refreshToken: null, // Clear refresh token to force re-authentication
    },
  });
};

export const refreshTokenService = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new CustomError('Refresh token is required.', 400);
  }

  try {
    // 1. Verify token signature
    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);

    // 2. Find user and match token stored in db
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== incomingRefreshToken) {
      throw new CustomError('Invalid or expired refresh token.', 401);
    }

    if (!user.isActive) {
      throw new CustomError('Account is deactivated.', 403);
    }

    // 3. Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // 4. Save new refresh token in db
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    logger.error('Refresh token verification failed:', error);
    throw new CustomError('Invalid or expired refresh token.', 401);
  }
};

export const getProfileService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new CustomError('User not found.', 404);
  }

  const { password: _, refreshToken: __, resetPasswordToken: ___, resetPasswordExpire: ____, ...profile } = user;
  return profile;
};
