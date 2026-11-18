import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import TwoFactorCode from '@/lib/models/TwoFactorCode';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  await connectDB();

  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ ok: false, error: 'User ID and verification code are required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const twoFactorCode = await TwoFactorCode.findOne({ userId, code, used: false, expiresAt: { $gt: new Date() } });
    if (!twoFactorCode) return res.status(401).json({ ok: false, error: 'Invalid or expired verification code.' });

    twoFactorCode.used = true;
    await twoFactorCode.save();

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    await createAuditLog({ userId: user._id.toString(), action: 'login_2fa', entityType: 'auth', meta: { email: user.email } });

    res.json({ ok: true, token, user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role, lastLoginAt: user.lastLoginAt } });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' });
  }
}
