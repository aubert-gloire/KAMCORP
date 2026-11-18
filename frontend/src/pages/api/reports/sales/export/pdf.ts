import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Sale from '@/lib/models/Sale';
import { getUser } from '@/lib/authHelpers';
import { generateSalesPDF } from '@/lib/pdfExport';

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

    const sales = await Sale.find(query).populate('productId', 'name sku').populate('soldBy', 'fullName').sort({ date: -1 }).lean();
    const dateRange = startDate && endDate ? `${new Date(startDate as string).toLocaleDateString()} - ${new Date(endDate as string).toLocaleDateString()}` : 'All Time';
    const buffer = await generateSalesPDF(sales, dateRange);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);
    res.send(buffer);
  } catch (error) {
    console.error('Export sales PDF error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export sales report as PDF.' });
  }
}
