import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Notification from '@/lib/models/Notification';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    await Notification.updateMany({ userId: authUser.userId, isRead: false }, { isRead: true });
    res.json({ ok: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ ok: false, error: 'Failed to mark all notifications as read' });
  }
}
