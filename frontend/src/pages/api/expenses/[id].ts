import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getUser } from '@/lib/authHelpers';
import { createAuditLog } from '@/lib/auditLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    try {
      const expense = await Expense.findById(id).populate('createdBy', 'fullName email role').lean();
      if (!expense) return res.status(404).json({ ok: false, error: 'Expense not found.' });
      res.json({ ok: true, data: expense });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to fetch expense.' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { category, amount, description, date, paymentMethod, receiptNumber } = req.body;
      const expense = await Expense.findById(id);
      if (!expense) return res.status(404).json({ ok: false, error: 'Expense not found.' });

      if (category) expense.category = category;
      if (amount !== undefined) {
        if (amount <= 0) return res.status(400).json({ ok: false, error: 'Amount must be greater than zero.' });
        expense.amount = parseFloat(amount);
      }
      if (description) expense.description = description;
      if (date) expense.date = new Date(date);
      if (paymentMethod) expense.paymentMethod = paymentMethod;
      if (receiptNumber !== undefined) expense.receiptNumber = receiptNumber;

      await expense.save();
      await expense.populate('createdBy', 'fullName email role');

      await createAuditLog({ userId: authUser.userId, action: 'update_expense', entityType: 'expense', entityId: expense._id, meta: { category: expense.category, amount: expense.amount } });

      res.json({ ok: true, data: expense, message: 'Expense updated successfully.' });
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message || 'Failed to update expense.' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const expense = await Expense.findById(id);
      if (!expense) return res.status(404).json({ ok: false, error: 'Expense not found.' });

      await createAuditLog({ userId: authUser.userId, action: 'delete_expense', entityType: 'expense', entityId: expense._id, meta: { category: expense.category, amount: expense.amount, description: expense.description } });
      await expense.deleteOne();

      res.json({ ok: true, message: 'Expense deleted successfully.' });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to delete expense.' });
    }
  } else {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
}
