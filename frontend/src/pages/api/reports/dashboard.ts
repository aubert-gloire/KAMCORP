import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/Product';
import { getUser } from '@/lib/authHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.aggregate([{ $match: { date: { $gte: today, $lt: tomorrow } } }, { $group: { _id: null, revenue: { $sum: '$totalPriceTZS' }, orders: { $sum: 1 } } }]);
    const todayStats = todaySales[0] || { revenue: 0, orders: 0 };

    const topProductToday = await Sale.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: '$productId', name: { $first: '$productSnapshot.name' }, sku: { $first: '$productSnapshot.sku' }, quantity: { $sum: '$quantitySold' } } },
      { $sort: { quantity: -1 } }, { $limit: 1 },
    ]);

    const lowStockCount = await Product.countDocuments({ stockQuantity: { $lte: 5 } });
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyRevenue = await Sale.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, revenue: { $sum: '$totalPriceTZS' } } },
      { $sort: { _id: 1 } },
    ]);

    const pendingPayments = await Sale.countDocuments({ paymentStatus: 'pending' });

    res.json({
      ok: true,
      dashboard: {
        todayRevenue: todayStats.revenue, todayOrders: todayStats.orders,
        topProductToday: topProductToday[0] || null, lowStockCount, pendingPayments,
        monthlyRevenueChart: monthlyRevenue.map(item => ({ date: item._id, revenue: item.revenue })),
      },
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate dashboard summary.' });
  }
}
