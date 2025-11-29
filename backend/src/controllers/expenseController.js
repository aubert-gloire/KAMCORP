import Expense from '../models/Expense.js';
import User from '../models/User.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { createExpenseNotification } from '../utils/notificationHelper.js';

/**
 * Get all expenses
 * GET /expenses
 * Query params: category, startDate, endDate, page, limit
 */
export const getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};
    if (category) filter.category = category;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(filter);

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'fullName email role')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      ok: true,
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch expenses.'
    });
  }
};

/**
 * Get single expense
 * GET /expenses/:id
 */
export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'fullName email role')
      .lean();

    if (!expense) {
      return res.status(404).json({
        ok: false,
        error: 'Expense not found.'
      });
    }

    res.json({
      ok: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch expense.'
    });
  }
};

/**
 * Create new expense
 * POST /expenses
 */
export const createExpense = async (req, res) => {
  try {
    const { category, amount, description, date, paymentMethod, receiptNumber } = req.body;

    // Validation
    if (!category || !amount || !description) {
      return res.status(400).json({
        ok: false,
        error: 'Category, amount, and description are required.'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'Amount must be greater than zero.'
      });
    }

    // Create expense
    const expense = await Expense.create({
      category,
      amount: parseFloat(amount),
      description,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'cash',
      receiptNumber,
      createdBy: req.user.userId
    });

    // Populate createdBy
    await expense.populate('createdBy', 'fullName email role');

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'create_expense',
      entityType: 'expense',
      entityId: expense._id,
      meta: {
        category: expense.category,
        amount: expense.amount,
        description: expense.description
      }
    });

    // Send notification to admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createExpenseNotification({
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        createdBy: req.user.fullName
      }, admin._id);
    }

    res.status(201).json({
      ok: true,
      data: expense,
      message: 'Expense created successfully.'
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to create expense.'
    });
  }
};

/**
 * Update expense
 * PUT /expenses/:id
 */
export const updateExpense = async (req, res) => {
  try {
    const { category, amount, description, date, paymentMethod, receiptNumber } = req.body;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        ok: false,
        error: 'Expense not found.'
      });
    }

    // Update fields
    if (category) expense.category = category;
    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({
          ok: false,
          error: 'Amount must be greater than zero.'
        });
      }
      expense.amount = parseFloat(amount);
    }
    if (description) expense.description = description;
    if (date) expense.date = new Date(date);
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (receiptNumber !== undefined) expense.receiptNumber = receiptNumber;

    await expense.save();
    await expense.populate('createdBy', 'fullName email role');

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'update_expense',
      entityType: 'expense',
      entityId: expense._id,
      meta: {
        category: expense.category,
        amount: expense.amount
      }
    });

    res.json({
      ok: true,
      data: expense,
      message: 'Expense updated successfully.'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to update expense.'
    });
  }
};

/**
 * Delete expense
 * DELETE /expenses/:id
 */
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({
        ok: false,
        error: 'Expense not found.'
      });
    }

    await expense.deleteOne();

    // Create audit log
    await createAuditLog({
      userId: req.user.userId,
      action: 'delete_expense',
      entityType: 'expense',
      entityId: expense._id,
      meta: {
        category: expense.category,
        amount: expense.amount,
        description: expense.description
      }
    });

    res.json({
      ok: true,
      message: 'Expense deleted successfully.'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete expense.'
    });
  }
};

/**
 * Get expense statistics
 * GET /expenses/stats/summary
 */
export const getExpenseStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const matchStage = Object.keys(dateFilter).length > 0 
      ? { date: dateFilter } 
      : {};

    // Total expenses by category
    const categoryBreakdown = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Total statistics
    const totalsResult = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          avgExpense: { $avg: '$amount' }
        }
      }
    ]);

    const totals = totalsResult[0] || {
      totalAmount: 0,
      totalCount: 0,
      avgExpense: 0
    };

    // Top 5 highest expenses
    const topExpenses = await Expense.find(matchStage)
      .populate('createdBy', 'fullName email')
      .sort({ amount: -1 })
      .limit(5)
      .lean();

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrend = await Expense.aggregate([
      { 
        $match: { 
          date: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      ok: true,
      data: {
        totals: {
          totalAmount: totals.totalAmount,
          totalCount: totals.totalCount,
          averageExpense: totals.avgExpense
        },
        categoryBreakdown: categoryBreakdown.map(item => ({
          category: item._id,
          total: item.total,
          count: item.count,
          percentage: totals.totalAmount > 0 
            ? ((item.total / totals.totalAmount) * 100).toFixed(2)
            : 0
        })),
        topExpenses,
        monthlyTrend: monthlyTrend.map(item => ({
          month: item._id,
          total: item.total,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch expense statistics.'
    });
  }
};
