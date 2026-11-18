import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const suppliers = await Purchase.distinct('supplierText');
    res.json({ ok: true, suppliers: suppliers.sort() });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch suppliers.' });
  }
}
