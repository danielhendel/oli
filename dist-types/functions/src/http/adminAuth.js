// services/functions/src/http/adminAuth.ts
import { admin } from '../firebaseAdmin';
/**
 * Verifies Firebase ID token and requires `admin: true` custom claim.
 *
 * Send header:
 * Authorization: Bearer <ID_TOKEN>
 */
export const requireAdmin = async (authorizationHeader) => {
    const header = authorizationHeader ?? '';
    const match = header.match(/^Bearer (.+)$/);
    const token = match?.[1];
    if (!token) {
        return { ok: false, status: 401, message: 'Missing Authorization: Bearer <token>' };
    }
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        const claims = decoded;
        const isAdmin = claims['admin'] === true;
        if (!isAdmin) {
            return { ok: false, status: 403, message: 'Admin privileges required' };
        }
        return { ok: true, uid: decoded.uid, claims };
    }
    catch {
        return { ok: false, status: 401, message: 'Invalid or expired token' };
    }
};
