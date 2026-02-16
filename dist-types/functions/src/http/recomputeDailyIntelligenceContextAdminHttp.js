// services/functions/src/http/recomputeDailyIntelligenceContextAdminHttp.ts
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { requireAdmin } from './adminAuth';
import { buildDailyIntelligenceContext } from '../intelligence/buildDailyIntelligenceContext';
const isYmd = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const parseBody = (raw) => {
    if (!raw || typeof raw !== 'object')
        return null;
    const obj = raw;
    const userId = obj['userId'];
    const date = obj['date'];
    if (!isNonEmptyString(userId))
        return null;
    if (!isYmd(date))
        return null;
    return { userId, date };
};
/**
 * Admin-only HTTP endpoint
 * Recomputes Daily Intelligence Context for a specific user + date
 * from DailyFacts + Insights.
 *
 * Input:
 *  { "userId": "...", "date": "YYYY-MM-DD" }
 */
export const recomputeDailyIntelligenceContextAdminHttp = onRequest({ region: 'us-central1' }, async (req, res) => {
    const auth = await requireAdmin(req.header('authorization'));
    if (!auth.ok) {
        res.status(auth.status).json({ ok: false, error: auth.message });
        return;
    }
    const body = parseBody(req.body);
    if (!body) {
        res.status(400).json({ ok: false, error: 'Invalid body. Expected { userId, date: YYYY-MM-DD }' });
        return;
    }
    const { userId, date } = body;
    const computedAt = new Date().toISOString();
    try {
        const userRef = db.collection('users').doc(userId);
        const dailyFactsSnap = await userRef.collection('dailyFacts').doc(date).get();
        if (!dailyFactsSnap.exists) {
            res.status(404).json({ ok: false, error: `DailyFacts not found for userId=${userId} date=${date}` });
            return;
        }
        const today = dailyFactsSnap.data();
        const insightsSnap = await userRef
            .collection('insights')
            .where('date', '==', date)
            .get();
        const insightsForDay = insightsSnap.docs.map((d) => d.data());
        const intelligenceDoc = buildDailyIntelligenceContext({
            userId,
            date,
            computedAt,
            today,
            insightsForDay,
        });
        const outRef = userRef.collection('intelligenceContext').doc(date);
        await outRef.set(intelligenceDoc, { merge: true });
        logger.info('Admin recomputeDailyIntelligenceContext complete', { userId, date });
        res.status(200).json({
            ok: true,
            written: true,
            userId,
            date,
            path: outRef.path,
            insightsCount: insightsForDay.length,
        });
    }
    catch (err) {
        logger.error('Admin recomputeDailyIntelligenceContext failed', { userId, date, err });
        res.status(500).json({ ok: false, error: 'Internal error recomputing Daily Intelligence Context' });
    }
});
