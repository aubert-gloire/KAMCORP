import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { createLowStockNotification, createSaleNotification } from '../utils/notificationHelper.js';
import mongoose from 'mongoose';

/**
 * Get all sales
 * GET /sales
 */
export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, productId, page = 1, limit = 50 } = req.query;
    
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

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sales = await Sale.find(filter)
      .populate('soldBy', 'fullName email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Sale.countDocuments(filter);

    res.json({
      ok: true,
      data: sales.map(sale => ({
        _id: sale._id,
        product: {
          _id: sale.productSnapshot?.productId || sale.productId,
          name: sale.productSnapshot?.name || 'Unknown',
          sku: sale.productSnapshot?.sku || 'N/A'
        },
        productSnapshot: {
          name: sale.productSnapshot?.name || 'Unknown',
          sku: sale.productSnapshot?.sku || 'N/A',
          sellingPrice: sale.unitPriceAtSaleTZS
        },
        quantity: sale.quantitySold,
        totalAmount: sale.totalPriceTZS,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        saleDate: sale.date,
        createdBy: sale.soldBy
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch sales.'
    });
  }
};

/**
 * Get single sale
 * GET /sales/:id
 */
export const getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('soldBy', 'fullName email')
      .populate('productId', 'name sku');
    
    if (!sale) {
      return res.status(404).json({
        ok: false,
        error: 'Sale not found.'
      });
    }

    res.json({
      ok: true,
      sale: {
        id: sale._id,
        product: sale.productId,
        productSnapshot: sale.productSnapshot,
        quantitySold: sale.quantitySold,
        unitPriceAtSaleTZS: sale.unitPriceAtSaleTZS,
        totalPriceTZS: sale.totalPriceTZS,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        soldBy: sale.soldBy,
        date: sale.date,
        createdAt: sale.createdAt
      }
    });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch sale.'
    });
  }
};

/**
 * Create sale
 * POST /sales
 */
export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      productId, 
      quantity, 
      paymentMethod, 
      paymentStatus = 'Paid',
      sellingPrice // Required: selling price determined at sale time (allows negotiation)
    } = req.body;

    // Validation
    if (!productId || !quantity || !sellingPrice || !paymentMethod) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        error: 'All fields are required: productId, quantity, sellingPrice, paymentMethod.'
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

    // Check stock availability
    if (product.stockQuantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        error: `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}.`
      });
    }

    // Use selling price from the sale form (allows negotiation/discounts)
    const unitPriceAtSaleTZS = parseFloat(sellingPrice);
    const quantitySold = quantity;
    
    // Validate selling price isn't negative
    if (unitPriceAtSaleTZS < 0) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        error: 'Selling price cannot be negative.'
      });
    }
    
    // Calculate total
    const totalPriceTZS = quantitySold * unitPriceAtSaleTZS;

    // Create sale
    const sale = await Sale.create([{
      productId,
      productSnapshot: {
        name: product.name,
        sku: product.sku
      },
      quantitySold,
      unitPriceAtSaleTZS,
      totalPriceTZS,
      paymentMethod,
      paymentStatus,
      soldBy: req.user.userId,
      date: new Date()
    }], { session });

    // Decrement stock
    product.stockQuantity -= quantitySold;
    await product.save({ session });

    // Check if stock is low and create notifications for admins
    if (product.stockQuantity <= 5 && product.stockQuantity > 0) {
      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      if (admins.length > 0) {
        await createLowStockNotification(product, admins);
      }
    }

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'create_sale',
      entityType: 'sale',
      entityId: sale[0]._id,
      meta: { 
        productName: product.name, 
        quantity: quantitySold,
        total: totalPriceTZS 
      }
    });

    // Create sale notification for admins
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    if (admins.length > 0) {
      const saleData = {
        _id: sale[0]._id,
        quantity: quantitySold,
        totalPrice: totalPriceTZS,
        productId: { name: product.name }
      };
      for (const admin of admins) {
        await createSaleNotification(saleData, admin._id);
      }
    }

    await session.commitTransaction();

    res.status(201).json({
      ok: true,
      sale: {
        id: sale[0]._id,
        productSnapshot: sale[0].productSnapshot,
        quantitySold: sale[0].quantitySold,
        unitPriceAtSaleTZS: sale[0].unitPriceAtSaleTZS,
        totalPriceTZS: sale[0].totalPriceTZS,
        paymentMethod: sale[0].paymentMethod,
        paymentStatus: sale[0].paymentStatus,
        date: sale[0].date
      },
      message: 'Sale recorded successfully.'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create sale error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to record sale.'
    });
  } finally {
    session.endSession();
  }
};

/**
 * Update sale payment status
 * PATCH /sales/:id/payment-status
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['paid', 'pending'].includes(paymentStatus)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid payment status. Must be "paid" or "pending".'
      });
    }

    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        ok: false,
        error: 'Sale not found.'
      });
    }

    sale.paymentStatus = paymentStatus;
    await sale.save();

    await createAuditLog({
      userId: req.user.userId,
      action: 'update_sale_payment',
      entityType: 'sale',
      entityId: sale._id,
      meta: { 
        newStatus: paymentStatus
      }
    });

    res.json({
      ok: true,
      sale: {
        id: sale._id,
        paymentStatus: sale.paymentStatus
      },
      message: 'Payment status updated successfully.'
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update payment status.'
    });
  }
};

/**
 * Update sale (for corrections)
 * PUT /sales/:id
 */
export const updateSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { quantity, sellingPrice, paymentMethod, paymentStatus } = req.body;

    const sale = await Sale.findById(req.params.id).session(session);
    
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Sale not found.'
      });
    }

    const product = await Product.findById(sale.productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Product not found.'
      });
    }

    // Restore old stock
    product.stockQuantity += sale.quantitySold;

    // Validate new stock
    if (quantity && product.stockQuantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({
        ok: false,
        error: `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}.`
      });
    }

    // Update sale fields
    if (quantity) {
      product.stockQuantity -= quantity;
      sale.quantitySold = quantity;
    }
    if (sellingPrice) {
      sale.unitPriceAtSaleTZS = parseFloat(sellingPrice);
    }
    if (paymentMethod) {
      sale.paymentMethod = paymentMethod;
    }
    if (paymentStatus) {
      sale.paymentStatus = paymentStatus;
    }

    // Recalculate total
    sale.totalPriceTZS = sale.quantitySold * sale.unitPriceAtSaleTZS;

    await sale.save({ session });
    await product.save({ session });

    await createAuditLog({
      userId: req.user.userId,
      action: 'update_sale',
      entityType: 'sale',
      entityId: sale._id,
      meta: { 
        productName: product.name,
        changes: req.body
      }
    });

    await session.commitTransaction();

    res.json({
      ok: true,
      sale: {
        id: sale._id,
        quantitySold: sale.quantitySold,
        unitPriceAtSaleTZS: sale.unitPriceAtSaleTZS,
        totalPriceTZS: sale.totalPriceTZS,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus
      },
      message: 'Sale updated successfully.'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Update sale error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update sale.'
    });
  } finally {
    session.endSession();
  }
};

/**
 * Delete sale
 * DELETE /sales/:id
 */
export const deleteSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    
    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({
        ok: false,
        error: 'Sale not found.'
      });
    }

    // Restore stock to product
    const product = await Product.findById(sale.productId).session(session);
    if (product) {
      product.stockQuantity += sale.quantitySold;
      await product.save({ session });
    }

    await createAuditLog({
      userId: req.user.userId,
      action: 'delete_sale',
      entityType: 'sale',
      entityId: sale._id,
      meta: { 
        productName: sale.productSnapshot.name,
        quantity: sale.quantitySold,
        total: sale.totalPriceTZS
      }
    });

    await Sale.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();

    res.json({
      ok: true,
      message: 'Sale deleted successfully and stock restored.'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Delete sale error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete sale.'
    });
  } finally {
    session.endSession();
  }
};
