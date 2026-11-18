import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getUser } from '@/lib/authHelpers';
import { generateExpensesExcel } from '@/lib/excelExport';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const { startDate, endDate } = req.query;
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) { const end = new Date(endDate as string); end.setHours(23, 59, 59, 999); dateFilter.$lte = end; }
    const query = dateFilter.$gte || dateFilter.$lte ? { date: dateFilter } : {};

    const expenses = await Expense.find(query).populate('createdBy', 'fullName email').sort({ date: -1 }).lean();
    const buffer = await generateExpensesExcel(expenses);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-report-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export expenses Excel error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export expenses report as Excel.' });
  }
}
