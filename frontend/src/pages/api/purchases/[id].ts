import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
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
      const purchase = await Purchase.findById(id).populate('productId', 'name sku category').populate('purchasedBy', 'fullName email');
      if (!purchase) return res.status(404).json({ ok: false, error: 'Purchase not found.' });
      res.json({ ok: true, purchase: { id: purchase._id, product: purchase.productId, quantityPurchased: purchase.quantityPurchased, unitCostTZS: purchase.unitCostTZS, totalCostTZS: purchase.totalCostTZS, supplierText: purchase.supplierText, purchasedBy: purchase.purchasedBy, date: purchase.date, createdAt: purchase.createdAt } });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to fetch purchase.' });
    }
  } else if (req.method === 'PUT') {
    if (!requireRole(authUser, ['admin', 'stock'], res)) return;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { quantity, costPrice, supplier } = req.body;
      const purchase = await Purchase.findById(id).session(session);
      if (!purchase) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Purchase not found.' }); }

      const product = await Product.findById(purchase.productId).session(session);
      if (!product) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Product not found.' }); }

      product.stockQuantity -= purchase.quantityPurchased;
      if (quantity) { product.stockQuantity += quantity; purchase.quantityPurchased = quantity; }
      else { product.stockQuantity += purchase.quantityPurchased; }
      if (costPrice) { purchase.unitCostTZS = parseFloat(costPrice); product.costPriceTZS = parseFloat(costPrice); }
      if (supplier) purchase.supplierText = supplier;
      purchase.totalCostTZS = purchase.quantityPurchased * purchase.unitCostTZS;

      await purchase.save({ session });
      await product.save({ session });
      await createAuditLog({ userId: authUser.userId, action: 'create_purchase', entityType: 'purchase', entityId: purchase._id, meta: { productName: product.name, changes: req.body } });
      await session.commitTransaction();

      res.json({ ok: true, purchase: { id: purchase._id, quantityPurchased: purchase.quantityPurchased, unitCostTZS: purchase.unitCostTZS, totalCostTZS: purchase.totalCostTZS, supplierText: purchase.supplierText }, message: 'Purchase updated successfully.' });
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({ ok: false, error: 'Failed to update purchase.' });
    } finally {
      session.endSession();
    }
  } else if (req.method === 'DELETE') {
    if (!requireRole(authUser, ['admin', 'stock'], res)) return;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const purchase = await Purchase.findById(id).session(session);
      if (!purchase) { await session.abortTransaction(); return res.status(404).json({ ok: false, error: 'Purchase not found.' }); }

      const product = await Product.findById(purchase.productId).session(session);
      if (product) { product.stockQuantity -= purchase.quantityPurchased; await product.save({ session }); }

      await createAuditLog({ userId: authUser.userId, action: 'create_purchase', entityType: 'purchase', entityId: purchase._id, meta: { quantity: purchase.quantityPurchased, total: purchase.totalCostTZS, supplier: purchase.supplierText } });
      await Purchase.findByIdAndDelete(id).session(session);
      await session.commitTransaction();

      res.json({ ok: true, message: 'Purchase deleted successfully and stock adjusted.' });
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({ ok: false, error: 'Failed to delete purchase.' });
    } finally {
      session.endSession();
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
