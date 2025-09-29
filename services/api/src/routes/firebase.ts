import { Router } from 'express';
import { db } from '../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router();

router.get('/healthz', async (_req, res) => {
  try {
    const docRef = db.collection('_meta').doc('healthz');

    await docRef.set(
      { lastCheckedAt: FieldValue.serverTimestamp(), source: 'api' },
      { merge: true }
    );

    const snap = await docRef.get();
    const data = snap.data() || {};

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
