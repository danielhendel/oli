// services/functions/src/http/adminAuth.ts

import { admin } from '../firebaseAdmin';

export type AdminAuthResult =
  | { ok: true; uid: string; claims: Record<string, unknown> }
  | { ok: false; status: number; message: string };

/**
 * Verifies Firebase ID token and requires `admin: true` custom claim.
 *
 * Send header:
 * Authorization: Bearer <ID_TOKEN>
 */
export const requireAdmin = async (authorizationHeader: string | undefined): Promise<AdminAuthResult> => {
  const header = authorizationHeader ?? '';
  const match = header.match(/^Bearer (.+)$/);
  const token = match?.[1];

  if (!token) {
    return { ok: false, status: 401, message: 'Missing Authorization: Bearer <token>' };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const claims = decoded as unknown as Record<string, unknown>;
    const isAdmin = claims['admin'] === true;

    if (!isAdmin) {
      return { ok: false, status: 403, message: 'Admin privileges required' };
    }

    return { ok: true, uid: decoded.uid, claims };
  } catch {
    return { ok: false, status: 401, message: 'Invalid or expired token' };
  }
};
