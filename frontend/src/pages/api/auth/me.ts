import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const user = await User.findById(authUser.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });
    res.json({ ok: true, user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role, lastLoginAt: user.lastLoginAt } });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user information.' });
  }
}
