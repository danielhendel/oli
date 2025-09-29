import { Router } from 'express';
import { db } from '../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router();

/**
 * GET /api/firebase/healthz
 * - Upserts a single doc at _meta/healthz with a server timestamp
 * - Reads it back and returns minimal status
 */
router.get('/healthz', async (_req, res) => {
  try {
    const docRef = db.collection('_meta').doc('healthz');

    await docRef.set(
      { lastCheckedAt: FieldValue.serverTimestamp(), source: 'api' },
      { merge: true }
    );

    const snap = await docRef.get();
    const data = snap.data() || {};

    // Convert Firestore Timestamp to ISO string if present
    const lastCheckedIso =
      data.lastCheckedAt?.toDate?.()?.toISOString?.() ?? null;

    res.json({
      ok: true,
      service: 'api',
      firestore: {
        exists: snap.exists,
        lastCheckedAt: lastCheckedIso,
      },
    });
  } catch (err: any) {
    // Avoid leaking internals
    console.error('firebase healthz error', err);
    res.status(500).json({
      ok: false,
      service: 'api',
      error: 'firestore_error',
      message: err?.message ?? String(err),
    });
  }
});

export default router;
