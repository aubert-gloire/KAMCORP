import express from 'express';
import { register, login, verify2FA, getMe, resetPassword, getUsers, updateUser, deleteUser, getAuditLogs } from '../controllers/authController.js';
import { verifyToken, checkRole, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', asyncHandler(login));
router.post('/verify-2fa', asyncHandler(verify2FA));

// Protected routes
router.post('/register', verifyToken, checkRole(['admin']), asyncHandler(register));
router.get('/me', verifyToken, asyncHandler(getMe));
router.get('/users', verifyToken, checkRole(['admin']), asyncHandler(getUsers));
router.get('/audit-logs', verifyToken, checkRole(['admin']), asyncHandler(getAuditLogs));
router.put('/users/:id', verifyToken, checkRole(['admin']), asyncHandler(updateUser));
router.delete('/users/:id', verifyToken, checkRole(['admin']), asyncHandler(deleteUser));
router.post('/reset-password', verifyToken, checkRole(['admin']), asyncHandler(resetPassword));

export default router;
