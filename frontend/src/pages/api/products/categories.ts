import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const categories = await Product.distinct('category');
    res.json({ ok: true, data: categories.sort() });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch categories.' });
  }
}
