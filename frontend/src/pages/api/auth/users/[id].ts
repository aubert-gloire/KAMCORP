import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });
  if (!requireRole(authUser, ['admin'], res)) return;

  await connectDB();
  const { id } = req.query as { id: string };

  if (req.method === 'PUT') {
    try {
      const { email, fullName, role } = req.body;
      if (!email || !fullName || !role) return res.status(400).json({ ok: false, error: 'Email, full name, and role are required.' });

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

      if (email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ ok: false, error: 'Email is already in use.' });
      }

      user.email = email;
      user.fullName = fullName;
      user.role = role;
      await user.save();

      await createAuditLog({ userId: authUser.userId, action: 'update_user', entityType: 'user', entityId: user._id, meta: { targetUser: user.email, role: user.role } });

      res.json({ ok: true, message: 'User updated successfully.', user: { _id: user._id, id: user._id, email: user.email, fullName: user.fullName, role: user.role } });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ ok: false, error: 'Failed to update user.' });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (id === authUser.userId) return res.status(400).json({ ok: false, error: 'You cannot delete your own account.' });

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

      await createAuditLog({ userId: authUser.userId, action: 'delete_user', entityType: 'user', entityId: user._id, meta: { targetUser: user.email, role: user.role } });
      await User.findByIdAndDelete(id);

      res.json({ ok: true, message: 'User deleted successfully.' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ ok: false, error: 'Failed to delete user.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
