import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getUser } from '@/lib/authHelpers';
import { jsonToCSV, formatPurchasesForCSV } from '@/lib/csvExport';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const { startDate, endDate } = req.query;
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
    const query = dateFilter.$gte || dateFilter.$lte ? { purchaseDate: dateFilter } : {};

    const purchases = await Purchase.find(query).populate('purchasedBy', 'fullName email').sort({ purchaseDate: -1 }).lean();
    const csv = jsonToCSV(formatPurchasesForCSV(purchases));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=purchases-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export purchases CSV error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export purchases report.' });
  }
}
