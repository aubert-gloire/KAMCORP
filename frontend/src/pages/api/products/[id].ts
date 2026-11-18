import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
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
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ ok: false, error: 'Product not found.' });
      res.json({ ok: true, data: { _id: product._id, name: product.name, sku: product.sku, category: product.category, description: (product as any).description || '', costPrice: product.costPriceTZS, sellingPrice: product.unitPriceTZS, stockQuantity: product.stockQuantity, reorderLevel: (product as any).reorderLevel || 10, isLowStock: (product as any).isLowStock, createdAt: product.createdAt, updatedAt: product.updatedAt } });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to fetch product.' });
    }
  } else if (req.method === 'PUT') {
    if (!requireRole(authUser, ['admin', 'stock'], res)) return;
    try {
      const { name, sku, category, description, costPrice, sellingPrice, stockQuantity, reorderLevel } = req.body;
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ ok: false, error: 'Product not found.' });

      if (name !== undefined) product.name = name;
      if (sku !== undefined) product.sku = sku.toUpperCase();
      if (category !== undefined) product.category = category;
      if (description !== undefined) (product as any).description = description;
      if (sellingPrice !== undefined) product.unitPriceTZS = sellingPrice;
      if (costPrice !== undefined) product.costPriceTZS = costPrice;
      if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
      if (reorderLevel !== undefined) (product as any).reorderLevel = reorderLevel;
      await product.save();

      await createAuditLog({ userId: authUser.userId, action: 'update_product', entityType: 'product', entityId: product._id, meta: { productName: product.name, sku: product.sku } });

      res.json({ ok: true, data: { _id: product._id, name: product.name, sku: product.sku, category: product.category, description: (product as any).description, costPrice: product.costPriceTZS, sellingPrice: product.unitPriceTZS, stockQuantity: product.stockQuantity, reorderLevel: (product as any).reorderLevel, isLowStock: (product as any).isLowStock }, message: 'Product updated successfully.' });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to update product.' });
    }
  } else if (req.method === 'DELETE') {
    if (!requireRole(authUser, ['admin', 'stock'], res)) return;
    try {
      const product = await Product.findById(id);
      if (!product) return res.status(404).json({ ok: false, error: 'Product not found.' });

      const { name: productName, sku: productSku } = product;
      await product.deleteOne();

      await createAuditLog({ userId: authUser.userId, action: 'delete_product', entityType: 'product', entityId: product._id, meta: { productName, sku: productSku } });

      res.json({ ok: true, message: 'Product deleted successfully.' });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to delete product.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
