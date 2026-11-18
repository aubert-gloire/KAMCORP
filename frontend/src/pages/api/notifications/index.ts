import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';
import { getUser, requireRole } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { isRead, limit = '20' } = req.query;
      const query: Record<string, unknown> = { userId: authUser.userId };
      if (isRead === 'true') query.isRead = true;
      if (isRead === 'false') query.isRead = false;

      const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(parseInt(limit as string)).lean();
      const unreadCount = await Notification.countDocuments({ userId: authUser.userId, isRead: false });

      res.json({ ok: true, notifications, unreadCount });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch notifications' });
    }
  } else if (req.method === 'POST') {
    if (!requireRole(authUser, ['admin'], res)) return;
    try {
      const { title, message, targetRole, link } = req.body;
      if (!title || !message) return res.status(400).json({ ok: false, error: 'Title and message are required.' });

      let targetUsers: any[];
      if (targetRole && targetRole !== 'all') {
        targetUsers = await User.find({ role: targetRole }).select('_id').lean();
      } else {
        targetUsers = await User.find().select('_id').lean();
      }

      if (targetUsers.length === 0) return res.status(400).json({ ok: false, error: 'No users found for the specified target.' });

      await Notification.insertMany(targetUsers.map(u => ({ userId: u._id, type: 'system', title, message, link: link || null, meta: { createdBy: authUser.userId, targetRole: targetRole || 'all' } })));

      res.status(201).json({ ok: true, message: `System notification sent to ${targetUsers.length} user(s).`, count: targetUsers.length });
    } catch (error) {
      console.error('Create system notification error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create system notification.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
