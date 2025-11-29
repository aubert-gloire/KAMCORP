import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { createPurchaseNotification } from '../utils/notificationHelper.js';
import mongoose from 'mongoose';

/**
 * Get all purchases
 * GET /purchases
 */
export const getPurchases = async (req, res) => {
  try {
    const { startDate, endDate, productId, supplier, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    
    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    
    // Product filter
    if (productId) {
      filter.productId = productId;
    }

    // Supplier filter
    if (supplier) {
      filter.supplierText = { $regex: supplier, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const purchases = await Purchase.find(filter)
      .populate('productId', 'name sku category')
      .populate('purchasedBy', 'fullName email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Purchase.countDocuments(filter);

    res.json({
      ok: true,
      data: purchases.map(purchase => ({
        _id: purchase._id,
        product: purchase.productId,
        quantity: purchase.quantityPurchased,
        costPrice: purchase.unitCostTZS,
        totalCost: purchase.totalCostTZS,
        supplier: purchase.supplierText,
        purchaseDate: purchase.date,
        createdBy: purchase.purchasedBy
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch purchases.'
    });
  }
};

/**
 * Get single purchase
 * GET /purchases/:id
 */
export const getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('productId', 'name sku category')
      .populate('purchasedBy', 'fullName email');
    
    if (!purchase) {
      return res.status(404).json({
        ok: false,
        error: 'Purchase not found.'
      });
    }

    res.json({
      ok: true,
      purchase: {
        id: purchase._id,
        product: purchase.productId,
        quantityPurchased: purchase.quantityPurchased,
        unitCostTZS: purchase.unitCostTZS,
        totalCostTZS: purchase.totalCostTZS,
        supplierText: purchase.supplierText,
        purchasedBy: purchase.purchasedBy,
        date: purchase.date,
        createdAt: purchase.createdAt
      }
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch purchase.'
    });
  }
};

/**
 * Create purchase
 * POST /purchases
 */
export const createPurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      productId, 
      quantity, 
      costPrice, 
      supplier 
    } = req.body;

    // Debug log
    console.log('Received purchase data:', { productId, quantity, costPrice, supplier });

    // Validation
    if (!productId || !quantity || !costPrice || !supplier) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        error: 'All fields are required: productId, quantity, costPrice, supplier.'
      });
    }

    // Find product
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Product not found.'
      });
    }

    // Map frontend fields to backend fields
    const quantityPurchased = quantity;
    const unitCostTZS = costPrice;
    const supplierText = supplier;
    
    // Calculate total
    const totalCostTZS = quantityPurchased * unitCostTZS;

    // Create purchase
    const purchase = await Purchase.create([{
      productId,
      quantityPurchased,
      unitCostTZS,
      totalCostTZS,
      supplierText,
      purchasedBy: req.user.userId,
      date: new Date()
    }], { session });

    // Increment stock
    product.stockQuantity += quantityPurchased;
    
    // Optionally update cost price (you can adjust this logic)
    product.costPriceTZS = unitCostTZS;
    
    await product.save({ session });

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'create_purchase',
      entityType: 'purchase',
      entityId: purchase[0]._id,
      meta: { 
        productName: product.name, 
        quantity: quantityPurchased,
        supplier: supplierText,
        total: totalCostTZS 
      }
    });

    // Create purchase notification for admins
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    if (admins.length > 0) {
      const purchaseData = {
        _id: purchase[0]._id,
        quantity: quantityPurchased,
        totalCost: totalCostTZS,
        productId: { name: product.name }
      };
      for (const admin of admins) {
        await createPurchaseNotification(purchaseData, admin._id);
      }
    }

    await session.commitTransaction();

    res.status(201).json({
      ok: true,
      purchase: {
        id: purchase[0]._id,
        productId: purchase[0].productId,
        quantityPurchased: purchase[0].quantityPurchased,
        unitCostTZS: purchase[0].unitCostTZS,
        totalCostTZS: purchase[0].totalCostTZS,
        supplierText: purchase[0].supplierText,
        date: purchase[0].date
      },
      message: 'Purchase recorded successfully.'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create purchase error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to record purchase.'
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get unique suppliers
 * GET /purchases/suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Purchase.distinct('supplierText');
    
    res.json({
      ok: true,
      suppliers: suppliers.sort()
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch suppliers.'
    });
  }
};

/**
 * Update purchase (for corrections)
 * PUT /purchases/:id
 */
export const updatePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { quantity, costPrice, supplier } = req.body;

    const purchase = await Purchase.findById(req.params.id).session(session);
    
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Purchase not found.'
      });
    }

    const product = await Product.findById(purchase.productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Product not found.'
      });
    }

    // Restore old stock
    product.stockQuantity -= purchase.quantityPurchased;

    // Update purchase fields
    if (quantity) {
      product.stockQuantity += quantity;
      purchase.quantityPurchased = quantity;
    } else {
      product.stockQuantity += purchase.quantityPurchased;
    }
    
    if (costPrice) {
      purchase.unitCostTZS = parseFloat(costPrice);
      product.costPriceTZS = parseFloat(costPrice);
    }
    
    if (supplier) {
      purchase.supplierText = supplier;
    }

    // Recalculate total
    purchase.totalCostTZS = purchase.quantityPurchased * purchase.unitCostTZS;

    await purchase.save({ session });
    await product.save({ session });

    await createAuditLog({
      userId: req.user.userId,
      action: 'update_purchase',
      entityType: 'purchase',
      entityId: purchase._id,
      meta: { 
        productName: product.name,
        changes: req.body
      }
    });

    await session.commitTransaction();

    res.json({
      ok: true,
      purchase: {
        id: purchase._id,
        quantityPurchased: purchase.quantityPurchased,
        unitCostTZS: purchase.unitCostTZS,
        totalCostTZS: purchase.totalCostTZS,
        supplierText: purchase.supplierText
      },
      message: 'Purchase updated successfully.'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Update purchase error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update purchase.'
    });
  } finally {
    session.endSession();
  }
};

/**
 * Delete purchase
 * DELETE /purchases/:id
 */
export const deletePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Purchase not found.'
      });
    }

    // Remove stock from product
    const product = await Product.findById(purchase.productId).session(session);
    if (product) {
      product.stockQuantity -= purchase.quantityPurchased;
      await product.save({ session });
    }

    await createAuditLog({
      userId: req.user.userId,
      action: 'delete_purchase',
      entityType: 'purchase',
      entityId: purchase._id,
      meta: { 
        quantity: purchase.quantityPurchased,
        total: purchase.totalCostTZS,
        supplier: purchase.supplierText
      }
    });

    await Purchase.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();

    res.json({
      ok: true,
      message: 'Purchase deleted successfully and stock adjusted.'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete purchase error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete purchase.'
    });
  } finally {
    session.endSession();
  }
};
