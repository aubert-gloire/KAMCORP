import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Notification from '@/lib/models/Notification';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();
  const { id } = req.query as { id: string };

  if (req.method === 'DELETE') {
    try {
      const notification = await Notification.findOneAndDelete({ _id: id, userId: authUser.userId });
      if (!notification) return res.status(404).json({ ok: false, error: 'Notification not found' });
      res.json({ ok: true, message: 'Notification deleted' });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to delete notification' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
