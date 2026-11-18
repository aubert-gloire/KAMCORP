import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { getUser } from '@/lib/authHelpers';
import { generateStockExcel } from '@/lib/excelExport';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const authUser = getUser(req);
  if (!authUser) return res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });

  await connectDB();

  try {
    const products = await Product.find({}).sort({ name: 1 }).lean();
    const buffer = await generateStockExcel(products);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stock-report-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export stock Excel error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export stock report as Excel.' });
  }
}
