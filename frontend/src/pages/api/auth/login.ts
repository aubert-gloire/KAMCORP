import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import TwoFactorCode from '@/lib/models/TwoFactorCode';
import { createAuditLog } from '@/lib/auditLogger';
import { generate2FACode, send2FACode } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  await connectDB();

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid email or password.' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ ok: false, error: 'Invalid email or password.' });

    if (user.role === 'admin') {
      const code = generate2FACode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await TwoFactorCode.create({ userId: user._id, code, expiresAt });
      const emailSent = await send2FACode(user.email, code, user.fullName);
      if (!emailSent) return res.status(500).json({ ok: false, error: 'Failed to send verification code.' });
      return res.json({ ok: true, requires2FA: true, userId: user._id, message: 'Verification code sent to your email.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    await createAuditLog({ userId: user._id.toString(), action: 'login', entityType: 'auth', meta: { email: user.email } });

    res.json({ ok: true, token, user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role, lastLoginAt: user.lastLoginAt } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ ok: false, error: 'Login failed. Please try again.' });
  }
}
