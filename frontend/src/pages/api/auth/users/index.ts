import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getUser, requireRole } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });
  if (!requireRole(authUser, ['admin'], res)) return;

  await connectDB();

  if (req.method === 'GET') {
    try {
      const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
      res.json({
        ok: true,
        users: users.map(u => ({ _id: u._id, id: u._id, email: u.email, fullName: u.fullName, role: u.role, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt })),
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch users.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
