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
    const { startDate, endDate } = req.query;
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
    const matchStage = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const categoryBreakdown = await Expense.aggregate([{ $match: matchStage }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]);
    const totalsResult = await Expense.aggregate([{ $match: matchStage }, { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalCount: { $sum: 1 }, avgExpense: { $avg: '$amount' } } }]);
    const totals = totalsResult[0] || { totalAmount: 0, totalCount: 0, avgExpense: 0 };

    const topExpenses = await Expense.find(matchStage).populate('createdBy', 'fullName email').sort({ amount: -1 }).limit(5).lean();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Expense.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      ok: true,
      data: {
        totals: { totalAmount: totals.totalAmount, totalCount: totals.totalCount, averageExpense: totals.avgExpense },
        categoryBreakdown: categoryBreakdown.map(item => ({ category: item._id, total: item.total, count: item.count, percentage: totals.totalAmount > 0 ? ((item.total / totals.totalAmount) * 100).toFixed(2) : 0 })),
        topExpenses,
        monthlyTrend: monthlyTrend.map(item => ({ month: item._id, total: item.total, count: item.count })),
      },
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch expense statistics.' });
  }
}
