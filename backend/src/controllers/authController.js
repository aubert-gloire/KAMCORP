import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import TwoFactorCode from '../models/TwoFactorCode.js';
import AuditLog from '../models/AuditLog.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generate2FACode, send2FACode } from '../services/emailService.js';

/**
 * Register new user (Admin only)
 * POST /auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, fullName, role = 'sales' } = req.body;

    // Debug log
    console.log('Received register data:', { email, fullName, role, hasPassword: !!password });

    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({
        ok: false,
        error: 'Email, password, and full name are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        error: 'A user with this email already exists.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role: role || 'sales'
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'create_user',
      entityType: 'user',
      entityId: user._id,
      meta: { email: user.email, role: user.role }
    });

    res.status(201).json({
      ok: true,
      data: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt
      },
      message: 'User created successfully.'
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to create user.'
    });
  }
};

/**
 * Login user
 * POST /auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Email and password are required.'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid email or password.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid email or password.'
      });
    }

    // Check if user is admin - require 2FA
    if (user.role === 'admin') {
      // Generate 6-digit code
      const code = generate2FACode();
      
      // Store code in database (expires in 10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await TwoFactorCode.create({
        userId: user._id,
        code,
        expiresAt,
      });

      // Send email with code
      const emailSent = await send2FACode(user.email, code, user.fullName);
      
      if (!emailSent) {
        return res.status(500).json({
          ok: false,
          error: 'Failed to send verification code. Please try again.'
        });
      }

      // Return response indicating 2FA is required
      return res.json({
        ok: true,
        requires2FA: true,
        userId: user._id,
        message: 'Verification code sent to your email.'
      });
    }

    // For non-admin users, proceed with normal login
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Create JWT token (valid for 1 day)
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Create audit log
    await createAuditLog({
      userId: user._id,
      action: 'login',
      entityType: 'auth',
      meta: { email: user.email }
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      ok: false,
      error: 'Login failed. Please try again.'
    });
  }
};

/**
 * Verify 2FA code
 * POST /auth/verify-2fa
 */
export const verify2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;

    // Validation
    if (!userId || !code) {
      return res.status(400).json({
        ok: false,
        error: 'User ID and verification code are required.'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found.'
      });
    }

    // Find valid code
    const twoFactorCode = await TwoFactorCode.findOne({
      userId,
      code,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!twoFactorCode) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid or expired verification code.'
      });
    }

    // Mark code as used
    twoFactorCode.used = true;
    await twoFactorCode.save();

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Create JWT token (valid for 1 day)
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Create audit log
    await createAuditLog({
      userId: user._id,
      action: 'login_2fa',
      entityType: 'auth',
      meta: { email: user.email }
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      ok: false,
      error: 'Verification failed. Please try again.'
    });
  }
};

/**
 * Get current user info
 * GET /auth/me
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found.'
      });
    }

    res.json({
      ok: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch user information.'
    });
  }
};

/**
 * Reset user password (Admin only)
 * POST /auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Validation
    if (!userId || !newPassword) {
      return res.status(400).json({
        ok: false,
        error: 'User ID and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found.'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'reset_password',
      entityType: 'user',
      entityId: userId,
      meta: { targetUser: user.email }
    });

    res.json({
      ok: true,
      message: 'Password reset successfully.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to reset password.'
    });
  }
};

/**
 * Get all users (Admin only)
 * GET /auth/users
 */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });

    res.json({
      ok: true,
      users: users.map(user => ({
        _id: user._id,
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch users.'
    });
  }
};

/**
 * Update user (Admin only)
 * PUT /auth/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName, role } = req.body;

    if (!email || !fullName || !role) {
      return res.status(400).json({
        ok: false,
        error: 'Email, full name, and role are required.'
      });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found.'
      });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          ok: false,
          error: 'Email is already in use.'
        });
      }
    }

    // Update user
    user.email = email;
    user.fullName = fullName;
    user.role = role;
    await user.save();

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'update_user',
      entityType: 'user',
      entityId: user._id,
      meta: { targetUser: user.email, role: user.role }
    });

    res.json({
      ok: true,
      message: 'User updated successfully.',
      user: {
        _id: user._id,
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update user.'
    });
  }
};

/**
 * Delete user (Admin only)
 * DELETE /auth/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.userId) {
      return res.status(400).json({
        ok: false,
        error: 'You cannot delete your own account.'
      });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found.'
      });
    }

    // Create audit log before deletion
    await createAuditLog({
      userId: req.user.userId,
      action: 'delete_user',
      entityType: 'user',
      entityId: user._id,
      meta: { targetUser: user.email, role: user.role }
    });

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({
      ok: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete user.'
    });
  }
};

/**
 * Get audit logs (Admin only)
 * GET /auth/audit-logs
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { action, entityType, userId, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch audit logs
    const logs = await AuditLog.find(filter)
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      ok: true,
      data: logs.map(log => ({
        _id: log._id,
        user: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        meta: log.meta,
        createdAt: log.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch audit logs.'
    });
  }
};
