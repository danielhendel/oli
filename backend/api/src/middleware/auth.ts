import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

export interface AuthedRequest extends Request { uid?: string }

export const requireAuth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    const idToken = header.substring('Bearer '.length);
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
