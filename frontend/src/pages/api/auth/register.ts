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
    const { email, password, fullName, role = 'sales' } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ ok: false, error: 'Email, password, and full name are required.' });
    if (password.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters long.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ ok: false, error: 'A user with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash, fullName, role: role || 'sales' });

    await createAuditLog({ userId: authUser.userId, action: 'create_user', entityType: 'user', entityId: user._id, meta: { email: user.email, role: user.role } });

    res.status(201).json({ ok: true, data: { _id: user._id, email: user.email, fullName: user.fullName, role: user.role, createdAt: user.createdAt }, message: 'User created successfully.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create user.' });
  }
}
