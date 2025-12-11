// services/functions/src/insights/onInsightsRecomputeScheduled.ts

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import type {
  DailyFacts,
  IsoDateTimeString,
  YmdDateString,
} from '../types/health';
import type { WriteResult } from 'firebase-admin/firestore';
import { generateInsightsForDailyFacts } from './rules';

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');

  return `${year.toString().padStart(4, '0')}-${paddedMonth}-${paddedDay}`;
};

const getYesterdayUtcYmd = (): YmdDateString => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const yesterday = new Date(Date.UTC(year, month, day - 1));
  return toYmdUtc(yesterday);
};

/**
 * Scheduled job:
 *  - Runs daily (UTC)
 *  - Reads DailyFacts for the previous UTC day across all users
 *  - Generates baseline Insights and writes them under /users/{userId}/insights
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/dailyFacts/{yyyy-MM-dd}
 *  - Output: /users/{userId}/insights/{insightId}
 */
export const onInsightsRecomputeScheduled = onSchedule(
  {
    // Run shortly after DailyFacts recompute (which is at 03:00 UTC).
    schedule: '15 3 * * *',
    region: 'us-central1',
  },
  async () => {
    const targetDate = getYesterdayUtcYmd();
    const now: IsoDateTimeString = new Date().toISOString();

    logger.info('Insights recompute started', { targetDate });

    const dailyFactsSnapshot = await db
      .collectionGroup('dailyFacts')
      .where('date', '==', targetDate)
      .get();

    if (dailyFactsSnapshot.empty) {
      logger.info('No DailyFacts found for target date', { targetDate });
      return;
    }

    const writes: Promise<WriteResult>[] = [];

    dailyFactsSnapshot.docs.forEach((doc) => {
      const facts = doc.data() as DailyFacts;
      const { userId, date } = facts;
      const insights = generateInsightsForDailyFacts({
        userId,
        date,
        facts,
        now,
      });

      if (insights.length === 0) {
        return;
      }

      const userRef = db.collection('users').doc(userId);
      const insightsCol = userRef.collection('insights');

      insights.forEach((insight) => {
        const ref = insightsCol.doc(insight.id);
        writes.push(ref.set(insight));
      });
    });

    if (writes.length === 0) {
      logger.info('No insights generated for target date', { targetDate });
      return;
    }

    await Promise.all(writes);

    logger.info('Insights recompute completed', {
      targetDate,
      insightsWritten: writes.length,
    });
  },
);
