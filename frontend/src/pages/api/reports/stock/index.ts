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
    const products = await Product.find({}).sort({ stockQuantity: 1 }).lean();

    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum: number, p: any) => sum + (p.stockQuantity * p.purchasePriceTZS), 0);
    const totalRetailValue = products.reduce((sum: number, p: any) => sum + (p.stockQuantity * p.sellingPriceTZS), 0);
    const lowStockItems = products.filter((p: any) => p.stockQuantity <= (p.reorderLevel || 5));
    const outOfStockItems = products.filter((p: any) => p.stockQuantity === 0);

    const categoryBreakdown = products.reduce((acc: Record<string, any>, p: any) => {
      const cat = p.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { category: cat, count: 0, stockValue: 0, retailValue: 0, totalQuantity: 0 };
      acc[cat].count += 1;
      acc[cat].stockValue += p.stockQuantity * p.purchasePriceTZS;
      acc[cat].retailValue += p.stockQuantity * p.sellingPriceTZS;
      acc[cat].totalQuantity += p.stockQuantity;
      return acc;
    }, {});

    res.json({
      ok: true,
      data: {
        summary: { totalProducts, totalStockValue, totalRetailValue, potentialProfit: totalRetailValue - totalStockValue, lowStockCount: lowStockItems.length, outOfStockCount: outOfStockItems.length },
        products,
        lowStockItems,
        outOfStockItems,
        categoryBreakdown: Object.values(categoryBreakdown),
      },
    });
  } catch (error) {
    console.error('Get stock report error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate stock report.' });
  }
}
