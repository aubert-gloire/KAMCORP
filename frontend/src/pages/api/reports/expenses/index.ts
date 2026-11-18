import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
    const matchStage: Record<string, unknown> = dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {};

    let dateGroupFormat: unknown;
    if (groupBy === 'week') dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$date' } };
    else if (groupBy === 'month') dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
    else dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };

    const [totalsResult, timeline, categoryBreakdown] = await Promise.all([
      Expense.aggregate([{ $match: matchStage }, { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalCount: { $sum: 1 }, avgAmount: { $avg: '$amount' } } }]),
      Expense.aggregate([{ $match: matchStage }, { $group: { _id: dateGroupFormat, amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 365 }]),
      Expense.aggregate([{ $match: matchStage }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    ]);

    const totals = totalsResult[0] || { totalAmount: 0, totalCount: 0, avgAmount: 0 };

    res.json({
      ok: true,
      data: {
        totals: { totalAmount: totals.totalAmount, totalCount: totals.totalCount, averageAmount: totals.avgAmount },
        timeline: timeline.map((i: any) => ({ period: i._id, amount: i.amount, count: i.count })),
        categoryBreakdown: categoryBreakdown.map((i: any) => ({ category: i._id, total: i.total, count: i.count, percentage: totals.totalAmount > 0 ? ((i.total / totals.totalAmount) * 100).toFixed(2) : 0 })),
      },
    });
  } catch (error) {
    console.error('Get expenses report error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate expenses report.' });
  }
}
