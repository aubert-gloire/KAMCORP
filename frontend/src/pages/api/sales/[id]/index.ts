import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
import Product from '@/lib/models/Product';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    try {
      const sale = await Sale.findById(id).populate('soldBy', 'fullName email').populate('productId', 'name sku');
      if (!sale) return res.status(404).json({ ok: false, error: 'Sale not found.' });
      res.json({ ok: true, sale: { id: sale._id, product: sale.productId, productSnapshot: sale.productSnapshot, quantitySold: sale.quantitySold, unitPriceAtSaleTZS: sale.unitPriceAtSaleTZS, totalPriceTZS: sale.totalPriceTZS, paymentMethod: sale.paymentMethod, paymentStatus: sale.paymentStatus, soldBy: sale.soldBy, date: sale.date, createdAt: sale.createdAt } });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to fetch sale.' });
    }
  } else if (req.method === 'PUT') {
    if (!requireRole(authUser, ['admin', 'sales'], res)) return;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { quantity, sellingPrice, paymentMethod, paymentStatus } = req.body;
      const sale = await Sale.findById(id).session(session);
      if (!sale) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Sale not found.' }); }

      const product = await Product.findById(sale.productId).session(session);
      if (!product) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Product not found.' }); }

      product.stockQuantity += sale.quantitySold;
      if (quantity && product.stockQuantity < quantity) { await session.abortTransaction(); return res.status(400).json({ ok: false, error: `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}.` }); }

      if (quantity) { product.stockQuantity -= quantity; sale.quantitySold = quantity; }
      if (sellingPrice) sale.unitPriceAtSaleTZS = parseFloat(sellingPrice);
      if (paymentMethod) sale.paymentMethod = paymentMethod;
      if (paymentStatus) sale.paymentStatus = paymentStatus;
      sale.totalPriceTZS = sale.quantitySold * sale.unitPriceAtSaleTZS;

      await sale.save({ session });
      await product.save({ session });
      await createAuditLog({ userId: authUser.userId, action: 'create_sale', entityType: 'sale', entityId: sale._id, meta: { productName: product.name, changes: req.body } });
      await session.commitTransaction();

      res.json({ ok: true, sale: { id: sale._id, quantitySold: sale.quantitySold, unitPriceAtSaleTZS: sale.unitPriceAtSaleTZS, totalPriceTZS: sale.totalPriceTZS, paymentMethod: sale.paymentMethod, paymentStatus: sale.paymentStatus }, message: 'Sale updated successfully.' });
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({ ok: false, error: 'Failed to update sale.' });
    } finally {
      session.endSession();
    }
  } else if (req.method === 'DELETE') {
    if (!requireRole(authUser, ['admin', 'sales'], res)) return;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const sale = await Sale.findById(id).session(session);
      if (!sale) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Sale not found.' }); }

      const product = await Product.findById(sale.productId).session(session);
      if (product) { product.stockQuantity += sale.quantitySold; await product.save({ session }); }

      await createAuditLog({ userId: authUser.userId, action: 'create_sale', entityType: 'sale', entityId: sale._id, meta: { productName: sale.productSnapshot.name, quantity: sale.quantitySold, total: sale.totalPriceTZS } });
      await Sale.findByIdAndDelete(id).session(session);
      await session.commitTransaction();

      res.json({ ok: true, message: 'Sale deleted successfully and stock restored.' });
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({ ok: false, error: 'Failed to delete sale.' });
    } finally {
      session.endSession();
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
