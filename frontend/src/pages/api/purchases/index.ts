import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';
import { createPurchaseNotification } from '@/lib/notificationHelper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { startDate, endDate, productId, supplier, page = '1', limit = '50' } = req.query;
      const filter: Record<string, unknown> = {};
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
        filter.date = dateFilter;
      }
      if (productId) filter.productId = productId;
      if (supplier) filter.supplierText = { $regex: supplier, $options: 'i' };

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const purchases = await Purchase.find(filter).populate('productId', 'name sku category').populate('purchasedBy', 'fullName email').sort({ date: -1 }).skip(skip).limit(parseInt(limit as string));
      const total = await Purchase.countDocuments(filter);

      res.json({
        ok: true,
        data: purchases.map(p => ({
          _id: p._id, product: p.productId,
          productSnapshot: p.productSnapshot || (p.productId ? { name: (p.productId as any).name, sku: (p.productId as any).sku } : { name: '[Deleted Product]', sku: 'N/A' }),
          quantity: p.quantityPurchased, costPrice: p.unitCostTZS, totalCost: p.totalCostTZS,
          supplier: p.supplierText, purchaseDate: p.date, createdBy: p.purchasedBy,
        })),
        pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) },
      });
    } catch (error) {
      console.error('Get purchases error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch purchases.' });
    }
  } else if (req.method === 'POST') {
    if (!requireRole(authUser, ['admin', 'stock'], res)) return;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { productId, quantity, costPrice, supplier } = req.body;
      if (!productId || !quantity || !costPrice || !supplier) {
        await session.abortTransaction();
        return res.status(400).json({ ok: false, error: 'All fields are required: productId, quantity, costPrice, supplier.' });
      }

      const product = await Product.findById(productId).session(session);
      if (!product) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Product not found.' }); }

      const totalCostTZS = quantity * costPrice;
      const purchase = await Purchase.create([{ productId, productSnapshot: { name: product.name, sku: product.sku }, quantityPurchased: quantity, unitCostTZS: costPrice, totalCostTZS, supplierText: supplier, purchasedBy: authUser.userId, date: new Date() }], { session });

      product.stockQuantity += quantity;
      product.costPriceTZS = costPrice;
      await product.save({ session });

      await createAuditLog({ userId: authUser.userId, action: 'create_purchase', entityType: 'purchase', entityId: purchase[0]._id, meta: { productName: product.name, quantity, supplier, total: totalCostTZS } });

      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      for (const admin of admins) {
        await createPurchaseNotification({ _id: purchase[0]._id, quantity, totalCost: totalCostTZS, productId: { name: product.name } }, admin._id);
      }

      await session.commitTransaction();
      res.status(201).json({ ok: true, purchase: { id: purchase[0]._id, productId: purchase[0].productId, quantityPurchased: purchase[0].quantityPurchased, unitCostTZS: purchase[0].unitCostTZS, totalCostTZS: purchase[0].totalCostTZS, supplierText: purchase[0].supplierText, date: purchase[0].date }, message: 'Purchase recorded successfully.' });
    } catch (error) {
      await session.abortTransaction();
      console.error('Create purchase error:', error);
      res.status(500).json({ ok: false, error: 'Failed to record purchase.' });
    } finally {
      session.endSession();
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
