import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Expense from '@/lib/models/Expense';
import { getUser } from '@/lib/authHelpers';
import PDFDocument from 'pdfkit';

function generateExpensesPDF(expenses: any[], dateRange: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('Expenses Report', { align: 'center' });
    doc.fontSize(10).text(`Period: ${dateRange}`, { align: 'center' });
    doc.moveDown();

    const totalAmount = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    doc.fontSize(12).text(`Total Expenses: TZS ${totalAmount.toLocaleString()}`);
    doc.text(`Number of Entries: ${expenses.length}`);
    doc.moveDown();

    doc.fontSize(10);
    const colWidths = [80, 180, 90, 100, 90];
    const headers = ['Date', 'Description', 'Category', 'Amount (TZS)', 'Created By'];
    let x = 40;
    headers.forEach((h, i) => { doc.text(h, x, doc.y, { width: colWidths[i], continued: i < headers.length - 1 }); x += colWidths[i]; });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);

    expenses.forEach((e: any) => {
      x = 40;
      const row = [
        new Date(e.date).toLocaleDateString(),
        e.description,
        e.category,
        e.amount.toLocaleString(),
        e.createdBy?.fullName || 'N/A',
      ];
      const rowY = doc.y;
      row.forEach((cell, i) => { doc.text(String(cell), x, rowY, { width: colWidths[i], continued: i < row.length - 1 }); x += colWidths[i]; });
      doc.moveDown(0.3);
    });

    doc.end();
  });
}

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

    const expenses = await Expense.find(query).populate('createdBy', 'fullName').sort({ date: -1 }).lean();
    const dateRange = startDate && endDate ? `${new Date(startDate as string).toLocaleDateString()} - ${new Date(endDate as string).toLocaleDateString()}` : 'All Time';
    const buffer = await generateExpensesPDF(expenses, dateRange);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-report-${Date.now()}.pdf`);
    res.send(buffer);
  } catch (error) {
    console.error('Export expenses PDF error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export expenses report as PDF.' });
  }
}
