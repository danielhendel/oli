// services/functions/src/insights/onInsightsRecomputeScheduled.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import { generateInsightsForDailyFacts } from './rules';
const toYmdUtc = (date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const paddedMonth = month.toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');
    return `${year.toString().padStart(4, '0')}-${paddedMonth}-${paddedDay}`;
};
const parseIntStrict = (value) => {
    if (!/^\d+$/.test(value))
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
const parseYmdUtc = (ymd) => {
    // ymd is "YYYY-MM-DD"
    const parts = ymd.split('-');
    if (parts.length !== 3) {
        throw new Error(`Invalid YmdDateString: "${ymd}"`);
    }
    const y = parseIntStrict(parts[0] ?? '');
    const m = parseIntStrict(parts[1] ?? '');
    const d = parseIntStrict(parts[2] ?? '');
    if (y === null || m === null || d === null) {
        throw new Error(`Invalid YmdDateString: "${ymd}"`);
    }
    // monthIndex is 0-based
    return new Date(Date.UTC(y, m - 1, d));
};
const addDaysUtc = (ymd, deltaDays) => {
    const base = parseYmdUtc(ymd);
    const next = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
    return toYmdUtc(next);
};
const getYesterdayUtcYmd = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    const yesterday = new Date(Date.UTC(year, month, day - 1));
    return toYmdUtc(yesterday);
};
const buildWindowDatesInclusive = (endDate, windowSizeDays) => {
    // Returns [end-6, ..., end] for windowSizeDays=7
    const dates = [];
    for (let i = windowSizeDays - 1; i >= 0; i--) {
        dates.push(addDaysUtc(endDate, -i));
    }
    return dates;
};
const sortByDateAsc = (a, b) => {
    // YYYY-MM-DD string compare works for chronological order
    if (a.date < b.date)
        return -1;
    if (a.date > b.date)
        return 1;
    return 0;
};
const commitBatches = async (batches) => {
    for (const batch of batches) {
        await batch.commit();
    }
};
/**
 * Scheduled job:
 *  - Runs daily (UTC)
 *  - Finds users who have DailyFacts for the target date (yesterday UTC)
 *  - Loads a 7-day DailyFacts window for each user (history + today)
 *  - Generates Insights using Sprint 6 IntelligenceContext-aware rules
 *  - Writes results under /users/{userId}/insights/{insightId}
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/dailyFacts/{yyyy-MM-dd}
 *  - Output: /users/{userId}/insights/{insightId}
 */
export const onInsightsRecomputeScheduled = onSchedule({
    // Run shortly after DailyFacts recompute (which is at 03:00 UTC).
    schedule: '15 3 * * *',
    region: 'us-central1',
}, async () => {
    const targetDate = getYesterdayUtcYmd();
    const now = new Date().toISOString();
    // 7-day window ending at targetDate (inclusive).
    const windowDates = buildWindowDatesInclusive(targetDate, 7);
    logger.info('Insights recompute started', { targetDate, windowDates });
    // Find all users who have DailyFacts for targetDate.
    const dailyFactsSnapshot = await db
        .collectionGroup('dailyFacts')
        .where('date', '==', targetDate)
        .get();
    if (dailyFactsSnapshot.empty) {
        logger.info('No DailyFacts found for target date', { targetDate });
        return;
    }
    // We will batch writes (<= 500 ops per batch). Use 450 to keep margin.
    const MAX_OPS_PER_BATCH = 450;
    const batches = [];
    let currentBatch = db.batch();
    let currentOps = 0;
    let usersProcessed = 0;
    let insightsWritten = 0;
    let usersWithNoHistory = 0;
    for (const doc of dailyFactsSnapshot.docs) {
        const userId = doc.ref.parent.parent?.id;
        if (!userId) {
            logger.warn('Skipping DailyFacts doc with unexpected path', { path: doc.ref.path });
            continue;
        }
        const todayFacts = doc.data();
        if (!todayFacts || todayFacts.userId !== userId || todayFacts.date !== targetDate) {
            logger.warn('Skipping DailyFacts doc with inconsistent data', {
                path: doc.ref.path,
                userIdFromPath: userId,
                userIdFromDoc: todayFacts?.userId,
                dateFromDoc: todayFacts?.date,
                targetDate,
            });
            continue;
        }
        const userRef = db.collection('users').doc(userId);
        // 7-day window facts for this user (including today).
        const windowSnap = await userRef
            .collection('dailyFacts')
            .where('date', 'in', windowDates)
            .get();
        const windowFacts = windowSnap.docs.map((d) => d.data()).sort(sortByDateAsc);
        const today = windowFacts.find((f) => f.date === targetDate) ?? todayFacts;
        const history = windowFacts.filter((f) => f.date !== targetDate);
        if (history.length === 0) {
            usersWithNoHistory += 1;
        }
        const insights = generateInsightsForDailyFacts({
            userId,
            date: targetDate,
            today,
            history,
            now,
        });
        usersProcessed += 1;
        if (insights.length === 0) {
            continue;
        }
        const insightsCol = userRef.collection('insights');
        for (const insight of insights) {
            if (currentOps >= MAX_OPS_PER_BATCH) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                currentOps = 0;
            }
            const ref = insightsCol.doc(insight.id);
            currentBatch.set(ref, insight);
            currentOps += 1;
            insightsWritten += 1;
        }
    }
    if (currentOps > 0) {
        batches.push(currentBatch);
    }
    if (batches.length === 0) {
        logger.info('No insights generated for target date', { targetDate, usersProcessed });
        return;
    }
    await commitBatches(batches);
    logger.info('Insights recompute completed', {
        targetDate,
        usersProcessed,
        usersWithNoHistory,
        insightsWritten,
        batchesCommitted: batches.length,
    });
});
