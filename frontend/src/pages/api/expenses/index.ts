import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import User from '@/lib/models/User';
import { getUser } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';
import { createExpenseNotification } from '@/lib/notificationHelper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  if (req.method === 'GET') {
    try {
      const { category, startDate, endDate, page = '1', limit = '50' } = req.query;
      const filter: Record<string, unknown> = {};
      if (category) filter.category = category;
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
        filter.date = dateFilter;
      }
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const total = await Expense.countDocuments(filter);
      const expenses = await Expense.find(filter).populate('createdBy', 'fullName email role').sort({ date: -1 }).skip(skip).limit(parseInt(limit as string)).lean();
      res.json({ ok: true, data: expenses, pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) } });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch expenses.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { category, amount, description, date, paymentMethod, receiptNumber } = req.body;
      if (!category || !amount || !description) return res.status(400).json({ ok: false, error: 'Category, amount, and description are required.' });
      if (amount <= 0) return res.status(400).json({ ok: false, error: 'Amount must be greater than zero.' });

      const expense = await Expense.create({ category, amount: parseFloat(amount), description, date: date || new Date(), paymentMethod: paymentMethod || 'cash', receiptNumber, createdBy: authUser.userId });
      await expense.populate('createdBy', 'fullName email role');

      await createAuditLog({ userId: authUser.userId, action: 'create_expense', entityType: 'expense', entityId: expense._id, meta: { category: expense.category, amount: expense.amount, description: expense.description } });

      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await createExpenseNotification({ category: expense.category, amount: expense.amount, description: expense.description, createdBy: authUser.fullName }, admin._id);
      }

      res.status(201).json({ ok: true, data: expense, message: 'Expense created successfully.' });
    } catch (error: any) {
      console.error('Create expense error:', error);
      res.status(500).json({ ok: false, error: error.message || 'Failed to create expense.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
