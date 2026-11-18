import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });
  if (!requireRole(authUser, ['admin'], res)) return;

  await connectDB();

  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ ok: false, error: 'User ID and new password are required.' });
    if (newPassword.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters long.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    await createAuditLog({ userId: authUser.userId, action: 'reset_password', entityType: 'user', entityId: userId, meta: { targetUser: user.email } });

    res.json({ ok: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ ok: false, error: 'Failed to reset password.' });
  }
}
