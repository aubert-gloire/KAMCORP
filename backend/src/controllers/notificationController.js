import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Get user notifications
 * GET /notifications
 * Query params: isRead (true|false|all), limit
 */
export const getNotifications = async (req, res) => {
  try {
    const { isRead, limit = 20 } = req.query;
    const userId = req.user.userId; // Changed from req.user._id to req.user.userId

    const query = { userId };
    if (isRead === 'true') query.isRead = true;
    if (isRead === 'false') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      ok: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch notifications',
    });
  }
};

/**
 * Mark notification as read
 * PUT /notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        ok: false,
        error: 'Notification not found',
      });
    }

    res.json({
      ok: true,
      notification,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to mark notification as read',
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({
      ok: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to mark all notifications as read',
    });
  }
};

/**
 * Delete notification
 * DELETE /notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        ok: false,
        error: 'Notification not found',
      });
    }

    res.json({
      ok: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete notification',
    });
  }
};

/**
 * Get unread notification count
 * GET /notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const count = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      ok: true,
      count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get unread count',
    });
  }
};

/**
 * Create system notification (Admin only)
 * POST /notifications/system
 * Broadcast message to selected users or all users
 */
export const createSystemNotification = async (req, res) => {
  try {
    const { title, message, targetRole, link } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        ok: false,
        error: 'Title and message are required.',
      });
    }

    // Get target users
    let targetUsers;
    if (targetRole && targetRole !== 'all') {
      targetUsers = await User.find({ role: targetRole }).select('_id').lean();
    } else {
      targetUsers = await User.find().select('_id').lean();
    }

    if (targetUsers.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'No users found for the specified target.',
      });
    }

    // Create notifications for all target users
    const notifications = targetUsers.map(user => ({
      userId: user._id,
      type: 'system',
      title,
      message,
      link: link || null,
      meta: {
        createdBy: req.user.userId,
        targetRole: targetRole || 'all',
      },
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      ok: true,
      message: `System notification sent to ${targetUsers.length} user(s).`,
      count: targetUsers.length,
    });
  } catch (error) {
    console.error('Create system notification error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to create system notification.',
    });
  }
};
