import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Notification from '@/lib/models/Notification';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const count = await Notification.countDocuments({ userId: authUser.userId, isRead: false });
    res.json({ ok: true, count });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to get unread count' });
  }
}
