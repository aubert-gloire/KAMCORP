import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  createSystemNotification,
} from '../controllers/notificationController.js';
import { verifyToken, checkRole, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

router.get('/', asyncHandler(getNotifications));
router.get('/unread-count', asyncHandler(getUnreadCount));
router.post('/system', checkRole(['admin']), asyncHandler(createSystemNotification));
router.put('/read-all', asyncHandler(markAllAsRead));
router.put('/:id/read', asyncHandler(markAsRead));
router.delete('/:id', asyncHandler(deleteNotification));

export default router;
