import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
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

    const matchStage: Record<string, unknown> = { ...(dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {}), paymentStatus: 'paid' };
    const pendingMatchStage: Record<string, unknown> = { ...(dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {}), paymentStatus: 'pending' };

    let dateGroupFormat: unknown;
    if (groupBy === 'week') dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$date' } };
    else if (groupBy === 'month') dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
    else dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };

    const [totalsResult, pendingTotalsResult, timeline, topProducts, paymentMethods] = await Promise.all([
      Sale.aggregate([{ $match: matchStage }, { $group: { _id: null, totalRevenue: { $sum: '$totalPriceTZS' }, totalOrders: { $sum: 1 }, totalQuantity: { $sum: '$quantitySold' } } }]),
      Sale.aggregate([{ $match: pendingMatchStage }, { $group: { _id: null, totalPending: { $sum: '$totalPriceTZS' }, pendingOrders: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: matchStage }, { $group: { _id: dateGroupFormat, revenue: { $sum: '$totalPriceTZS' }, orders: { $sum: 1 }, quantity: { $sum: '$quantitySold' } } }, { $sort: { _id: 1 } }, { $limit: 365 }]),
      Sale.aggregate([{ $match: matchStage }, { $group: { _id: '$productId', productName: { $first: '$productSnapshot.name' }, productSku: { $first: '$productSnapshot.sku' }, totalQuantity: { $sum: '$quantitySold' }, totalRevenue: { $sum: '$totalPriceTZS' }, orders: { $sum: 1 } } }, { $sort: { totalRevenue: -1 } }, { $limit: 10 }]),
      Sale.aggregate([{ $match: matchStage }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalPriceTZS' } } }]),
    ]);

    const totals = totalsResult[0] || { totalRevenue: 0, totalOrders: 0, totalQuantity: 0 };
    const pending = pendingTotalsResult[0] || { totalPending: 0, pendingOrders: 0 };

    res.json({
      ok: true,
      data: {
        totals: { totalRevenue: totals.totalRevenue, totalOrders: totals.totalOrders, totalQuantity: totals.totalQuantity, averageOrderValue: totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0, pendingRevenue: pending.totalPending, pendingOrders: pending.pendingOrders },
        timeline: timeline.map((i: any) => ({ period: i._id, revenue: i.revenue, orders: i.orders, quantity: i.quantity })),
        topProducts: topProducts.map((i: any) => ({ productId: i._id, name: i.productName, sku: i.productSku, quantity: i.totalQuantity, revenue: i.totalRevenue, orders: i.orders })),
        paymentMethods: paymentMethods.map((i: any) => ({ method: i._id, count: i.count, total: i.total })),
      },
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate sales report.' });
  }
}
