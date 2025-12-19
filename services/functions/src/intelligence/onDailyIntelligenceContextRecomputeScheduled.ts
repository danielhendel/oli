// services/functions/src/intelligence/onDailyIntelligenceContextRecomputeScheduled.ts

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import type { WriteBatch } from 'firebase-admin/firestore';

import { db } from '../firebaseAdmin';
import type { DailyFacts, Insight, IsoDateTimeString, YmdDateString } from '../types/health';
import { buildDailyIntelligenceContext } from './buildDailyIntelligenceContext';

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
};

const getYesterdayUtcYmd = (): YmdDateString => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return toYmdUtc(new Date(Date.UTC(y, m, d - 1)));
};

const commitBatches = async (batches: WriteBatch[]): Promise<void> => {
  for (const batch of batches) {
    await batch.commit();
  }
};

/**
 * Scheduled job:
 *  - Runs daily (UTC), after Insights recompute
 *  - For each user with DailyFacts on targetDate:
 *      - Load Insights for that day
 *      - Build DailyIntelligenceContext doc
 *      - Write to /users/{userId}/intelligenceContext/{YYYY-MM-DD}
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/dailyFacts/{yyyy-MM-dd}
 *  - Input:  /users/{userId}/insights/{yyyy-MM-dd}_{kind}
 *  - Output: /users/{userId}/intelligenceContext/{yyyy-MM-dd}
 */
export const onDailyIntelligenceContextRecomputeScheduled = onSchedule(
  {
    // DailyFacts: 03:00 UTC
    // Insights:   03:15 UTC
    // IntelligenceContext: run after Insights
    schedule: '30 3 * * *',
    region: 'us-central1',
  },
  async () => {
    const targetDate = getYesterdayUtcYmd();
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info('DailyIntelligenceContext recompute started', { targetDate });

    // Find all users who have DailyFacts for targetDate.
    const dailyFactsSnapshot = await db
      .collectionGroup('dailyFacts')
      .where('date', '==', targetDate)
      .get();

    if (dailyFactsSnapshot.empty) {
      logger.info('No DailyFacts found for target date', { targetDate });
      return;
    }

    const MAX_OPS_PER_BATCH = 450;
    const batches: WriteBatch[] = [];
    let currentBatch = db.batch();
    let currentOps = 0;

    let usersProcessed = 0;
    let docsWritten = 0;

    for (const doc of dailyFactsSnapshot.docs) {
      const userId = doc.ref.parent.parent?.id;

      if (!userId) {
        logger.warn('Skipping DailyFacts doc with unexpected path', { path: doc.ref.path });
        continue;
      }

      const today = doc.data() as DailyFacts;

      if (!today || today.userId !== userId || today.date !== targetDate) {
        logger.warn('Skipping DailyFacts doc with inconsistent data', {
          path: doc.ref.path,
          userIdFromPath: userId,
          userIdFromDoc: today?.userId,
          dateFromDoc: today?.date,
          targetDate,
        });
        continue;
      }

      const userRef = db.collection('users').doc(userId);

      const insightsSnap = await userRef
        .collection('insights')
        .where('date', '==', targetDate)
        .get();

      const insightsForDay = insightsSnap.docs.map((d) => d.data() as Insight);

      const intelligenceDoc = buildDailyIntelligenceContext({
        userId,
        date: targetDate,
        computedAt,
        today,
        insightsForDay,
      });

      if (currentOps >= MAX_OPS_PER_BATCH) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        currentOps = 0;
      }

      const outRef = userRef.collection('intelligenceContext').doc(targetDate);
      currentBatch.set(outRef, intelligenceDoc, { merge: true });
      currentOps += 1;

      usersProcessed += 1;
      docsWritten += 1;
    }

    if (currentOps > 0) {
      batches.push(currentBatch);
    }

    await commitBatches(batches);

    logger.info('DailyIntelligenceContext recompute completed', {
      targetDate,
      usersProcessed,
      docsWritten,
      batchesCommitted: batches.length,
    });
  },
);
