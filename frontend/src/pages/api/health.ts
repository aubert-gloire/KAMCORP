import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.json({ ok: true, message: 'KAMCORP API is running', timestamp: new Date().toISOString() });
}
