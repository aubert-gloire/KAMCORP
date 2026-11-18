import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import AuditLog from '@/lib/models/AuditLog';
import { getUser, requireRole } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });
  if (!requireRole(authUser, ['admin'], res)) return;

  await connectDB();

  try {
    const { action, entityType, userId, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (userId) filter.userId = userId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const logs = await AuditLog.find(filter).populate('userId', 'fullName email role').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit as string)).lean();
    const total = await AuditLog.countDocuments(filter);

    res.json({
      ok: true,
      data: logs.map((log: any) => ({ _id: log._id, user: log.userId, action: log.action, entityType: log.entityType, entityId: log.entityId, meta: log.meta, createdAt: log.createdAt })),
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit logs.' });
  }
}
