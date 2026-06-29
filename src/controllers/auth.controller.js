import * as authService from '../services/auth.service.js';

/**
 * Helper to configure HTTP-only cookies for refresh tokens
 */
const setRefreshTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days matches token expiry
  };
  res.cookie('refreshToken', token, cookieOptions);
};

export const signup = async (req, res, next) => {
  try {
    const user = await authService.signupService(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully as ADMIN.',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.loginService(req.body);
    
    // Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Clear cookie first
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    if (req.user && req.user.id) {
      await authService.logoutService(req.user.id);
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful.',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPasswordService(email);
    
    res.status(200).json({
      success: true,
      message: 'If a user with this email exists, a password reset token has been sent.',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPasswordService(token, password);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    await authService.changePasswordService(userId, oldPassword, newPassword);

    // Clear refresh token cookie as the session is invalidated
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login with your new password.',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    // Check both cookie and body for the refresh token
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
    
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshTokenService(incomingToken);

    // Set new refresh token in cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await authService.getProfileService(userId);

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully.',
      data: { user: profile }
    });
  } catch (error) {
    next(error);
  }
};
