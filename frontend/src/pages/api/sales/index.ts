import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';
import { createLowStockNotification, createSaleNotification } from '@/lib/notificationHelper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { startDate, endDate, productId, page = '1', limit = '50' } = req.query;
      const filter: Record<string, unknown> = {};
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
        filter.date = dateFilter;
      }
      if (productId) filter.productId = productId;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const sales = await Sale.find(filter).populate('soldBy', 'fullName email').sort({ date: -1 }).skip(skip).limit(parseInt(limit as string));
      const total = await Sale.countDocuments(filter);

      res.json({
        ok: true,
        data: sales.map(s => ({
          _id: s._id,
          product: { _id: (s as any).productSnapshot?.productId || s.productId, name: s.productSnapshot?.name || 'Unknown', sku: s.productSnapshot?.sku || 'N/A' },
          productSnapshot: { name: s.productSnapshot?.name || 'Unknown', sku: s.productSnapshot?.sku || 'N/A', sellingPrice: s.unitPriceAtSaleTZS },
          quantity: s.quantitySold, totalAmount: s.totalPriceTZS, paymentMethod: s.paymentMethod,
          paymentStatus: s.paymentStatus, saleDate: s.date, createdBy: s.soldBy,
        })),
        pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) },
      });
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch sales.' });
    }
  } else if (req.method === 'POST') {
    if (!requireRole(authUser, ['admin', 'sales'], res)) return;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { productId, quantity, paymentMethod, paymentStatus = 'Paid', sellingPrice } = req.body;
      if (!productId || !quantity || !sellingPrice || !paymentMethod) {
        await session.abortTransaction();
        return res.status(400).json({ ok: false, error: 'All fields are required: productId, quantity, sellingPrice, paymentMethod.' });
      }

      const product = await Product.findById(productId).session(session);
      if (!product) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Product not found.' }); }
      if (product.stockQuantity < quantity) { await session.abortTransaction(); return res.status(400).json({ ok: false, error: `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}.` }); }

      const unitPriceAtSaleTZS = parseFloat(sellingPrice);
      if (unitPriceAtSaleTZS < 0) { await session.abortTransaction(); return res.status(400).json({ ok: false, error: 'Selling price cannot be negative.' }); }
      const totalPriceTZS = quantity * unitPriceAtSaleTZS;

      const sale = await Sale.create([{ productId, productSnapshot: { name: product.name, sku: product.sku }, quantitySold: quantity, unitPriceAtSaleTZS, totalPriceTZS, paymentMethod, paymentStatus, soldBy: authUser.userId, date: new Date() }], { session });

      product.stockQuantity -= quantity;
      await product.save({ session });

      if (product.stockQuantity <= 5 && product.stockQuantity > 0) {
        const admins = await User.find({ role: 'admin' }).select('_id').lean();
        if (admins.length > 0) await createLowStockNotification(product, admins);
      }

      await createAuditLog({ userId: authUser.userId, action: 'create_sale', entityType: 'sale', entityId: sale[0]._id, meta: { productName: product.name, quantity, total: totalPriceTZS } });

      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      for (const admin of admins) {
        await createSaleNotification({ _id: sale[0]._id, quantity, totalPrice: totalPriceTZS, productId: { name: product.name } }, admin._id);
      }

      await session.commitTransaction();
      res.status(201).json({ ok: true, sale: { id: sale[0]._id, productSnapshot: sale[0].productSnapshot, quantitySold: sale[0].quantitySold, unitPriceAtSaleTZS: sale[0].unitPriceAtSaleTZS, totalPriceTZS: sale[0].totalPriceTZS, paymentMethod: sale[0].paymentMethod, paymentStatus: sale[0].paymentStatus, date: sale[0].date }, message: 'Sale recorded successfully.' });
    } catch (error) {
      await session.abortTransaction();
      console.error('Create sale error:', error);
      res.status(500).json({ ok: false, error: 'Failed to record sale.' });
    } finally {
      session.endSession();
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
