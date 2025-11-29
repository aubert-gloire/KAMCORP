import Product from '../models/Product.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Get all products
 * GET /products
 */
export const getProducts = async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    
    const filter = {};
    
    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category) {
      filter.category = category;
    }
    
    // Low stock filter
    if (lowStock === 'true') {
      filter.stockQuantity = { $lte: 5 };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({
      ok: true,
      data: products.map(product => ({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description || '',
        costPrice: product.costPriceTZS,
        sellingPrice: product.unitPriceTZS,
        stockQuantity: product.stockQuantity,
        reorderLevel: product.reorderLevel || 10,
        isLowStock: product.isLowStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch products.'
    });
  }
};

/**
 * Get single product
 * GET /products/:id
 */
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        ok: false,
        error: 'Product not found.'
      });
    }

    res.json({
      ok: true,
      data: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description || '',
        costPrice: product.costPriceTZS,
        sellingPrice: product.unitPriceTZS,
        stockQuantity: product.stockQuantity,
        reorderLevel: product.reorderLevel || 10,
        isLowStock: product.isLowStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch product.'
    });
  }
};

/**
 * Create product
 * POST /products
 */
export const createProduct = async (req, res) => {
  try {
    const { name, sku, category, description, costPrice, sellingPrice, stockQuantity, reorderLevel } = req.body;

    // Debug log
    console.log('Received product data:', { name, sku, category, description, costPrice, sellingPrice, stockQuantity, reorderLevel });

    // Validation
    if (!name || !sku || !category || costPrice === undefined || sellingPrice === undefined) {
      console.log('Validation failed:', { name: !!name, sku: !!sku, category: !!category, costPrice: costPrice !== undefined, sellingPrice: sellingPrice !== undefined });
      return res.status(400).json({
        ok: false,
        error: 'All required fields must be provided: name, sku, category, costPrice, sellingPrice.'
      });
    }

    // Check if SKU already exists
    const existingSKU = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSKU) {
      return res.status(400).json({
        ok: false,
        error: 'A product with this SKU already exists.'
      });
    }

    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      category,
      description: description || '',
      unitPriceTZS: sellingPrice,
      costPriceTZS: costPrice,
      stockQuantity: stockQuantity || 0,
      reorderLevel: reorderLevel || 10
    });

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'create_product',
      entityType: 'product',
      entityId: product._id,
      meta: { productName: name, sku: sku.toUpperCase() }
    });

    res.status(201).json({
      ok: true,
      data: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description,
        costPrice: product.costPriceTZS,
        sellingPrice: product.unitPriceTZS,
        stockQuantity: product.stockQuantity,
        reorderLevel: product.reorderLevel,
        isLowStock: product.isLowStock
      },
      message: 'Product created successfully.'
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to create product.'
    });
  }
};

/**
 * Update product
 * PUT /products/:id
 */
export const updateProduct = async (req, res) => {
  try {
    const { name, sku, category, description, costPrice, sellingPrice, stockQuantity, reorderLevel } = req.body;

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        ok: false,
        error: 'Product not found.'
      });
    }

    // Update fields
    if (name !== undefined) product.name = name;
    if (sku !== undefined) product.sku = sku.toUpperCase();
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (sellingPrice !== undefined) product.unitPriceTZS = sellingPrice;
    if (costPrice !== undefined) product.costPriceTZS = costPrice;
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
    if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;

    await product.save();

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'update_product',
      entityType: 'product',
      entityId: product._id,
      meta: { productName: product.name, sku: product.sku }
    });

    res.json({
      ok: true,
      data: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description,
        costPrice: product.costPriceTZS,
        sellingPrice: product.unitPriceTZS,
        stockQuantity: product.stockQuantity,
        reorderLevel: product.reorderLevel,
        isLowStock: product.isLowStock
      },
      message: 'Product updated successfully.'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update product.'
    });
  }
};

/**
 * Delete product
 * DELETE /products/:id
 */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        ok: false,
        error: 'Product not found.'
      });
    }

    const productName = product.name;
    const productSku = product.sku;

    await product.deleteOne();

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'delete_product',
      entityType: 'product',
      entityId: product._id,
      meta: { productName, sku: productSku }
    });

    res.json({
      ok: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete product.'
    });
  }
};

/**
 * Get product categories
 * GET /products/categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    
    res.json({
      ok: true,
      data: categories.sort()
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch categories.'
    });
  }
};
