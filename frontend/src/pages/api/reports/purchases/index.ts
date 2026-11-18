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
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
    const matchStage: Record<string, unknown> = dateFilter.$gte || dateFilter.$lte ? { purchaseDate: dateFilter } : {};

    let dateGroupFormat: unknown;
    if (groupBy === 'week') dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$purchaseDate' } };
    else if (groupBy === 'month') dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$purchaseDate' } };
    else dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } };

    const [totalsResult, timeline, topProducts, topSuppliers, paymentMethods] = await Promise.all([
      Purchase.aggregate([{ $match: matchStage }, { $group: { _id: null, totalSpent: { $sum: '$totalCostTZS' }, totalOrders: { $sum: 1 }, totalQuantity: { $sum: '$quantityPurchased' } } }]),
      Purchase.aggregate([{ $match: matchStage }, { $group: { _id: dateGroupFormat, spent: { $sum: '$totalCostTZS' }, orders: { $sum: 1 }, quantity: { $sum: '$quantityPurchased' } } }, { $sort: { _id: 1 } }, { $limit: 365 }]),
      Purchase.aggregate([{ $match: matchStage }, { $group: { _id: '$productId', productName: { $first: '$productSnapshot.name' }, totalQuantity: { $sum: '$quantityPurchased' }, totalSpent: { $sum: '$totalCostTZS' }, orders: { $sum: 1 } } }, { $sort: { totalSpent: -1 } }, { $limit: 10 }]),
      Purchase.aggregate([{ $match: matchStage }, { $group: { _id: '$supplier', totalSpent: { $sum: '$totalCostTZS' }, orders: { $sum: 1 } } }, { $sort: { totalSpent: -1 } }, { $limit: 10 }]),
      Purchase.aggregate([{ $match: matchStage }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalCostTZS' } } }]),
    ]);

    const totals = totalsResult[0] || { totalSpent: 0, totalOrders: 0, totalQuantity: 0 };

    res.json({
      ok: true,
      data: {
        totals: { totalSpent: totals.totalSpent, totalOrders: totals.totalOrders, totalQuantity: totals.totalQuantity, averageOrderValue: totals.totalOrders > 0 ? totals.totalSpent / totals.totalOrders : 0 },
        timeline: timeline.map((i: any) => ({ period: i._id, spent: i.spent, orders: i.orders, quantity: i.quantity })),
        topProducts: topProducts.map((i: any) => ({ productId: i._id, name: i.productName, quantity: i.totalQuantity, spent: i.totalSpent, orders: i.orders })),
        topSuppliers: topSuppliers.map((i: any) => ({ supplier: i._id, totalSpent: i.totalSpent, orders: i.orders })),
        paymentMethods: paymentMethods.map((i: any) => ({ method: i._id, count: i.count, total: i.total })),
      },
    });
  } catch (error) {
    console.error('Get purchases report error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate purchases report.' });
  }
}
