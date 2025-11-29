import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import Expense from '../models/Expense.js';
import {
  jsonToCSV,
  formatSalesForCSV,
  formatPurchasesForCSV,
  formatStockForCSV,
  formatReportDataForCSV
} from '../utils/csvExport.js';
import {
  generateSalesPDF,
  generatePurchasesPDF,
  generateStockPDF
} from '../utils/pdfExport.js';
import {
  generateSalesExcel,
  generatePurchasesExcel,
  generateStockExcel
} from '../utils/excelExport.js';

/**
 * Get sales report
 * GET /reports/sales
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    // Match stage - ONLY include PAID sales in revenue calculations
    const matchStage = {
      ...(dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {}),
      paymentStatus: 'paid' // Only include paid sales
    };

    // Determine grouping format
    let dateGroupFormat;
    switch (groupBy) {
      case 'week':
        dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$date' } };
        break;
      case 'month':
        dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default: // day
        dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    // Aggregation pipeline for totals
    const totalsResult = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPriceTZS' },
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$quantitySold' }
        }
      }
    ]);

    // Get pending sales totals separately
    const pendingMatchStage = {
      ...(dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {}),
      paymentStatus: 'pending'
    };
    
    const pendingTotalsResult = await Sale.aggregate([
      { $match: pendingMatchStage },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$totalPriceTZS' },
          pendingOrders: { $sum: 1 }
        }
      }
    ]);

    const totals = totalsResult[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      totalQuantity: 0
    };

    const pendingTotals = pendingTotalsResult[0] || {
      totalPending: 0,
      pendingOrders: 0
    };

    // Add pending info to totals
    totals.pendingRevenue = pendingTotals.totalPending;
    totals.pendingOrders = pendingTotals.pendingOrders;

    // Timeline aggregation (paid sales only)
    const timeline = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateGroupFormat,
          revenue: { $sum: '$totalPriceTZS' },
          orders: { $sum: 1 },
          quantity: { $sum: '$quantitySold' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 365 } // Limit results for performance
    ]);

    // Top products (paid sales only)
    const topProducts = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productSnapshot.name' },
          productSku: { $first: '$productSnapshot.sku' },
          totalQuantity: { $sum: '$quantitySold' },
          totalRevenue: { $sum: '$totalPriceTZS' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Payment method breakdown
    const paymentMethods = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$totalPriceTZS' }
        }
      }
    ]);

    res.json({
      ok: true,
      data: {
        totals: {
          totalRevenue: totals.totalRevenue,
          totalOrders: totals.totalOrders,
          totalQuantity: totals.totalQuantity,
          averageOrderValue: totals.totalOrders > 0 
            ? totals.totalRevenue / totals.totalOrders 
            : 0
        },
        timeline: timeline.map(item => ({
          period: item._id,
          revenue: item.revenue,
          orders: item.orders,
          quantity: item.quantity
        })),
        topProducts: topProducts.map(item => ({
          productId: item._id,
          name: item.productName,
          sku: item.productSku,
          quantity: item.totalQuantity,
          revenue: item.totalRevenue,
          orders: item.orders
        })),
        paymentMethods: paymentMethods.map(item => ({
          method: item._id,
          count: item.count,
          total: item.total
        }))
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate sales report.'
    });
  }
};

/**
 * Get stock report
 * GET /reports/stock
 */
export const getStockReport = async (req, res) => {
  try {
    const products = await Product.find()
      .select('name sku category stockQuantity unitPriceTZS costPriceTZS')
      .lean();

    // Calculate totals
    const totalStockValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.costPriceTZS), 0);
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.stockQuantity <= 5).length;
    const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

    // Category breakdown
    const categoryBreakdown = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = {
          category: product.category,
          count: 0,
          stockQuantity: 0,
          value: 0
        };
      }
      acc[product.category].count++;
      acc[product.category].stockQuantity += product.stockQuantity;
      acc[product.category].value += product.stockQuantity * product.costPriceTZS;
      return acc;
    }, {});

    // Low stock products
    const lowStockProducts = products
      .filter(p => p.stockQuantity <= 5 && p.stockQuantity > 0)
      .map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        stockQuantity: p.stockQuantity,
        value: p.stockQuantity * p.costPriceTZS
      }))
      .sort((a, b) => a.stockQuantity - b.stockQuantity);

    // Out of stock products
    const outOfStockProducts = products
      .filter(p => p.stockQuantity === 0)
      .map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        category: p.category
      }));

    res.json({
      ok: true,
      data: {
        totals: {
          totalStockValue,
          totalProducts,
          lowStockCount,
          outOfStockCount
        },
        categoryBreakdown: Object.values(categoryBreakdown),
        lowStockProducts,
        outOfStockProducts,
        allProducts: products.map(p => ({
          id: p._id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          stockQuantity: p.stockQuantity,
          unitPriceTZS: p.unitPriceTZS,
          costPriceTZS: p.costPriceTZS,
          stockValue: p.stockQuantity * p.costPriceTZS,
          isLowStock: p.stockQuantity <= 5
        }))
      }
    });
  } catch (error) {
    console.error('Get stock report error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate stock report.'
    });
  }
};

/**
 * Get purchases report
 * GET /reports/purchases
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
export const getPurchasesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    // Determine grouping format
    let dateGroupFormat;
    switch (groupBy) {
      case 'week':
        dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$date' } };
        break;
      case 'month':
        dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default: // day
        dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    // Totals aggregation
    const totalsResult = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$totalCostTZS' },
          totalPurchases: { $sum: 1 },
          totalQuantity: { $sum: '$quantityPurchased' }
        }
      }
    ]);

    const totals = totalsResult[0] || {
      totalSpend: 0,
      totalPurchases: 0,
      totalQuantity: 0
    };

    // Timeline aggregation
    const timeline = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateGroupFormat,
          spend: { $sum: '$totalCostTZS' },
          purchases: { $sum: 1 },
          quantity: { $sum: '$quantityPurchased' }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 365 }
    ]);

    // Supplier breakdown
    const supplierBreakdown = await Purchase.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$supplierText',
          totalSpend: { $sum: '$totalCostTZS' },
          purchaseCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantityPurchased' }
        }
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 10 }
    ]);

    // Top purchased products
    const topProducts = await Purchase.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$product.name' },
          productSku: { $first: '$product.sku' },
          totalQuantity: { $sum: '$quantityPurchased' },
          totalSpend: { $sum: '$totalCostTZS' },
          purchaseCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      ok: true,
      data: {
        totals: {
          totalSpend: totals.totalSpend,
          totalPurchases: totals.totalPurchases,
          totalQuantity: totals.totalQuantity,
          averagePurchaseValue: totals.totalPurchases > 0 
            ? totals.totalSpend / totals.totalPurchases 
            : 0
        },
        timeline: timeline.map(item => ({
          period: item._id,
          spend: item.spend,
          purchases: item.purchases,
          quantity: item.quantity
        })),
        supplierBreakdown: supplierBreakdown.map(item => ({
          supplier: item._id,
          spend: item.totalSpend,
          purchases: item.purchaseCount,
          quantity: item.totalQuantity
        })),
        topProducts: topProducts.map(item => ({
          productId: item._id,
          name: item.productName,
          sku: item.productSku,
          quantity: item.totalQuantity,
          spend: item.totalSpend,
          purchases: item.purchaseCount
        }))
      }
    });
  } catch (error) {
    console.error('Get purchases report error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate purchases report.'
    });
  }
};

/**
 * Get dashboard summary
 * GET /reports/dashboard
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await Sale.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalPriceTZS' },
          orders: { $sum: 1 }
        }
      }
    ]);

    const todayStats = todaySales[0] || { revenue: 0, orders: 0 };

    // Top product today
    const topProductToday = await Sale.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: '$productId',
          name: { $first: '$productSnapshot.name' },
          sku: { $first: '$productSnapshot.sku' },
          quantity: { $sum: '$quantitySold' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 }
    ]);

    // Low stock count
    const lowStockCount = await Product.countDocuments({ stockQuantity: { $lte: 5 } });

    // Monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyRevenue = await Sale.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          revenue: { $sum: '$totalPriceTZS' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Pending payments
    const pendingPayments = await Sale.countDocuments({ paymentStatus: 'pending' });

    res.json({
      ok: true,
      dashboard: {
        todayRevenue: todayStats.revenue,
        todayOrders: todayStats.orders,
        topProductToday: topProductToday[0] || null,
        lowStockCount,
        pendingPayments,
        monthlyRevenueChart: monthlyRevenue.map(item => ({
          date: item._id,
          revenue: item.revenue
        }))
      }
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate dashboard summary.'
    });
  }
};

/**
 * Export sales report as CSV
 * GET /reports/sales/export
 */
export const exportSalesCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    const sales = await Sale.find(matchStage)
      .populate('soldBy', 'fullName email')
      .sort({ date: -1 })
      .lean();

    const csvData = formatSalesForCSV(sales);
    const csv = jsonToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export sales CSV error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export sales report.'
    });
  }
};

/**
 * Export purchases report as CSV
 * GET /reports/purchases/export
 */
export const exportPurchasesCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    const purchases = await Purchase.find(matchStage)
      .populate('productId', 'name sku')
      .populate('purchasedBy', 'fullName email')
      .sort({ date: -1 })
      .lean();

    const csvData = formatPurchasesForCSV(purchases);
    const csv = jsonToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=purchases-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export purchases CSV error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export purchases report.'
    });
  }
};

/**
 * Export stock report as CSV
 * GET /reports/stock/export
 */
export const exportStockCSV = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 }).lean();

    const csvData = formatStockForCSV(products);
    const csv = jsonToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=stock-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export stock CSV error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export stock report.'
    });
  }
};

/**
 * Export Sales Report as PDF
 * GET /reports/sales/export/pdf
 */
export const exportSalesPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const query = dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {};
    const sales = await Sale.find(query)
      .populate('productId', 'name sku')
      .populate('soldBy', 'fullName')
      .sort({ date: -1 })
      .lean();

    const dateRange = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : 'All Time';

    const pdfBuffer = await generateSalesPDF(sales, dateRange);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export sales PDF error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export sales report as PDF.'
    });
  }
};

/**
 * Export Purchases Report as PDF
 * GET /reports/purchases/export/pdf
 */
export const exportPurchasesPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const query = dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {};
    const purchases = await Purchase.find(query)
      .populate('productId', 'name sku')
      .populate('purchasedBy', 'fullName')
      .sort({ date: -1 })
      .lean();

    const dateRange = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : 'All Time';

    const pdfBuffer = await generatePurchasesPDF(purchases, dateRange);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=purchases-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export purchases PDF error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export purchases report as PDF.'
    });
  }
};

/**
 * Export Stock Report as PDF
 * GET /reports/stock/export/pdf
 */
export const exportStockPDF = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 }).lean();

    const pdfBuffer = await generateStockPDF(products);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=stock-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export stock PDF error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export stock report as PDF.'
    });
  }
};

/**
 * Export Sales Report as Excel
 * GET /reports/sales/export/xlsx
 */
export const exportSalesExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const query = dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {};
    const sales = await Sale.find(query)
      .populate('productId', 'name sku')
      .populate('soldBy', 'fullName')
      .sort({ date: -1 })
      .lean();

    const dateRange = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : 'All Time';

    const workbook = await generateSalesExcel(sales, dateRange);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export sales Excel error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export sales report as Excel.'
    });
  }
};

/**
 * Export Purchases Report as Excel
 * GET /reports/purchases/export/xlsx
 */
export const exportPurchasesExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const query = dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {};
    const purchases = await Purchase.find(query)
      .populate('productId', 'name sku')
      .populate('purchasedBy', 'fullName')
      .sort({ date: -1 })
      .lean();

    const dateRange = startDate && endDate 
      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
      : 'All Time';

    const workbook = await generatePurchasesExcel(purchases, dateRange);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=purchases-report-${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export purchases Excel error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export purchases report as Excel.'
    });
  }
};

/**
 * Export Stock Report as Excel
 * GET /reports/stock/export/xlsx
 */
export const exportStockExcel = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 }).lean();

    const workbook = await generateStockExcel(products);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stock-report-${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export stock Excel error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export stock report as Excel.'
    });
  }
};

/**
 * Get Expenses Report with timeline and summary
 * GET /reports/expenses
 */
export const getExpensesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    let dateGroupFormat;
    switch (groupBy) {
      case 'week':
        dateGroupFormat = { $dateToString: { format: '%Y-W%V', date: '$date' } };
        break;
      case 'month':
        dateGroupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      default:
        dateGroupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    const totalsResult = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalExpenses: { $sum: 1 }
        }
      }
    ]);

    const totals = totalsResult[0] || {
      totalAmount: 0,
      totalExpenses: 0
    };

    totals.averageExpenseAmount = totals.totalExpenses > 0 
      ? totals.totalAmount / totals.totalExpenses 
      : 0;

    const timeline = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateGroupFormat,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 365 }
    ]).then(results => 
      results.map(item => ({
        period: item._id,
        amount: item.amount,
        count: item.count
      }))
    );

    res.json({
      ok: true,
      data: {
        totals,
        timeline
      }
    });
  } catch (error) {
    console.error('Expenses report error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to generate expenses report.'
    });
  }
};

/**
 * Export Expenses Report as CSV
 * GET /reports/expenses/export
 */
export const exportExpensesCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    const expenses = await Expense.find(matchStage).sort({ date: -1 }).lean();

    const csvData = expenses.map(expense => ({
      Date: new Date(expense.date).toLocaleDateString(),
      Category: expense.category,
      Description: expense.description || '',
      'Amount (TZS)': expense.amount,
      'Payment Method': expense.paymentMethod || '',
      'Receipt Number': expense.receiptNumber || ''
    }));

    const csv = jsonToCSV(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export expenses CSV error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export expenses report as CSV.'
    });
  }
};

/**
 * Export Expenses Report as PDF
 * GET /reports/expenses/export/pdf
 */
export const exportExpensesPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    const expenses = await Expense.find(matchStage).sort({ date: -1 }).lean();

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-report-${Date.now()}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Expenses Report', { align: 'center' });
    doc.moveDown(0.5);

    // Period
    if (startDate && endDate) {
      doc.fontSize(11).font('Helvetica').text(
        `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        { align: 'center' }
      );
      doc.moveDown(1.5);
    }

    // Summary Box
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    doc.rect(50, doc.y, 495, 70).fillAndStroke('#f3f4f6', '#d1d5db');
    doc.fillColor('#000000');
    
    doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
    doc.fontSize(11).font('Helvetica')
      .text(`Total Expenses: ${expenses.length}`, 60, doc.y + 10)
      .text(`Total Amount: TZS ${totalAmount.toLocaleString()}`, 60, doc.y + 5)
      .text(`Average: TZS ${(totalAmount / expenses.length || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}`, 60, doc.y + 5);
    
    doc.moveDown(3);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    
    doc.rect(50, tableTop, 495, 25).fillAndStroke('#9333ea', '#9333ea');
    doc.fillColor('#ffffff');
    
    doc.text('#', 60, tableTop + 8, { width: 30 });
    doc.text('Date', 100, tableTop + 8, { width: 80 });
    doc.text('Category', 190, tableTop + 8, { width: 80 });
    doc.text('Description', 280, tableTop + 8, { width: 150 });
    doc.text('Amount (TZS)', 440, tableTop + 8, { width: 95, align: 'right' });
    
    doc.moveDown(1.5);

    // Table Rows
    let yPosition = doc.y;
    doc.fillColor('#000000').font('Helvetica');
    
    expenses.forEach((expense, index) => {
      // Check if we need a new page
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
        
        // Redraw header on new page
        doc.fontSize(10).font('Helvetica-Bold');
        doc.rect(50, yPosition, 495, 25).fillAndStroke('#9333ea', '#9333ea');
        doc.fillColor('#ffffff');
        doc.text('#', 60, yPosition + 8, { width: 30 });
        doc.text('Date', 100, yPosition + 8, { width: 80 });
        doc.text('Category', 190, yPosition + 8, { width: 80 });
        doc.text('Description', 280, yPosition + 8, { width: 150 });
        doc.text('Amount (TZS)', 440, yPosition + 8, { width: 95, align: 'right' });
        yPosition += 30;
        doc.fillColor('#000000').font('Helvetica');
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(50, yPosition - 5, 495, 25).fill('#f9fafb');
      }

      doc.fontSize(9);
      doc.fillColor('#000000');
      doc.text(`${index + 1}`, 60, yPosition, { width: 30 });
      doc.text(new Date(expense.date).toLocaleDateString(), 100, yPosition, { width: 80 });
      doc.text(expense.category.charAt(0).toUpperCase() + expense.category.slice(1), 190, yPosition, { width: 80 });
      
      const description = expense.description || 'N/A';
      const truncatedDesc = description.length > 30 ? description.substring(0, 27) + '...' : description;
      doc.text(truncatedDesc, 280, yPosition, { width: 150 });
      
      doc.text(expense.amount.toLocaleString(), 440, yPosition, { width: 95, align: 'right' });
      
      yPosition += 25;
    });

    // Footer
    const bottomY = 750;
    doc.fontSize(8).fillColor('#6b7280').text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      50,
      bottomY,
      { align: 'center' }
    );

    doc.end();
  } catch (error) {
    console.error('Export expenses PDF error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export expenses report as PDF.'
    });
  }
};

/**
 * Export Expenses Report as Excel
 * GET /reports/expenses/export/xlsx
 */
export const exportExpensesExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = dateFilter.$gte || dateFilter.$lte 
      ? { date: dateFilter } 
      : {};

    const expenses = await Expense.find(matchStage).sort({ date: -1 }).lean();

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expenses Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount (TZS)', key: 'amount', width: 15 },
      { header: 'Payment Method', key: 'payment', width: 15 },
      { header: 'Receipt Number', key: 'receipt', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };

    expenses.forEach(expense => {
      worksheet.addRow({
        date: new Date(expense.date).toLocaleDateString(),
        category: expense.category,
        description: expense.description || '',
        amount: expense.amount,
        payment: expense.paymentMethod || '',
        receipt: expense.receiptNumber || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-report-${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export expenses Excel error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to export expenses report as Excel.'
    });
  }
};

