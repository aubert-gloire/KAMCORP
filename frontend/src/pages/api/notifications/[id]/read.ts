import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Notification from '@/lib/models/Notification';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();
  const { id } = req.query as { id: string };

  try {
    const notification = await Notification.findOneAndUpdate({ _id: id, userId: authUser.userId }, { isRead: true }, { new: true });
    if (!notification) return res.status(404).json({ ok: false, error: 'Notification not found' });
    res.json({ ok: true, notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ ok: false, error: 'Failed to mark notification as read' });
  }
}
