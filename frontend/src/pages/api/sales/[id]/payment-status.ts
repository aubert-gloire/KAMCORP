import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });
  if (!requireRole(authUser, ['admin', 'sales'], res)) return;

  await connectDB();
  const { id } = req.query as { id: string };

  try {
    const { paymentStatus } = req.body;
    if (!['paid', 'pending'].includes(paymentStatus)) {
      return res.status(400).json({ ok: false, error: 'Invalid payment status. Must be "paid" or "pending".' });
    }

    const sale = await Sale.findById(id);
    if (!sale) return res.status(404).json({ ok: false, error: 'Sale not found.' });

    sale.paymentStatus = paymentStatus;
    await sale.save();

    await createAuditLog({ userId: authUser.userId, action: 'create_sale', entityType: 'sale', entityId: sale._id, meta: { newStatus: paymentStatus } });

    res.json({ ok: true, sale: { id: sale._id, paymentStatus: sale.paymentStatus }, message: 'Payment status updated successfully.' });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update payment status.' });
  }
}
