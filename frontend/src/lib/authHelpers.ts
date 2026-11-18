import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}

export function getUser(req: NextApiRequest): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser & { userId: string };
    return { userId: decoded.userId, email: decoded.email, role: decoded.role, fullName: decoded.fullName };
  } catch {
    return null;
  }
}

export function requireAuth(res: NextApiResponse): false {
  res.status(401).json({ ok: false, error: 'No token provided. Authentication required.' });
  return false;
}

export function requireRole(user: AuthUser, roles: string[], res: NextApiResponse): boolean {
  if (!roles.includes(user.role)) {
    res.status(403).json({ ok: false, error: `Access denied. Required role: ${roles.join(' or ')}` });
    return false;
  }
  return true;
}
