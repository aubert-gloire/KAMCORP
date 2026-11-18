import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { getUser, requireRole } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { search, category, lowStock } = req.query;
      const filter: Record<string, unknown> = {};
      if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }];
      if (category) filter.category = category;
      if (lowStock === 'true') filter.stockQuantity = { $lte: 5 };

      const products = await Product.find(filter).sort({ name: 1 });
      res.json({
        ok: true,
        data: products.map(p => ({
          _id: p._id, name: p.name, sku: p.sku, category: p.category,
          description: (p as any).description || '', costPrice: p.costPriceTZS, sellingPrice: p.unitPriceTZS,
          stockQuantity: p.stockQuantity, reorderLevel: (p as any).reorderLevel || 10,
          isLowStock: (p as any).isLowStock, createdAt: p.createdAt, updatedAt: p.updatedAt,
        })),
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch products.' });
    }
  } else if (req.method === 'POST') {
    if (!requireRole(authUser, ['admin', 'stock'], res)) return;
    try {
      const { name, sku, category, description, costPrice, sellingPrice, stockQuantity, reorderLevel } = req.body;
      if (!name || !sku || !category || costPrice === undefined || sellingPrice === undefined) {
        return res.status(400).json({ ok: false, error: 'All required fields must be provided: name, sku, category, costPrice, sellingPrice.' });
      }

      const existing = await Product.findOne({ sku: sku.toUpperCase() });
      if (existing) return res.status(400).json({ ok: false, error: 'A product with this SKU already exists.' });

      const product = await Product.create({
        name, sku: sku.toUpperCase(), category, description: description || '',
        unitPriceTZS: sellingPrice, costPriceTZS: costPrice,
        stockQuantity: stockQuantity || 0, reorderLevel: reorderLevel || 10,
      });

      await createAuditLog({ userId: authUser.userId, action: 'create_product', entityType: 'product', entityId: product._id, meta: { productName: name, sku: sku.toUpperCase() } });

      res.status(201).json({
        ok: true,
        data: { _id: product._id, name: product.name, sku: product.sku, category: product.category, description: (product as any).description, costPrice: product.costPriceTZS, sellingPrice: product.unitPriceTZS, stockQuantity: product.stockQuantity, reorderLevel: (product as any).reorderLevel, isLowStock: (product as any).isLowStock },
        message: 'Product created successfully.',
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ ok: false, error: 'Failed to create product.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
