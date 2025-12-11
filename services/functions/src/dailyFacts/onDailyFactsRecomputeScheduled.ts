// services/functions/src/dailyFacts/onDailyFactsRecomputeScheduled.ts

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import type {
  CanonicalEvent,
  DailyFacts,
  IsoDateTimeString,
  YmdDateString,
} from '../types/health';
import type { WriteResult } from 'firebase-admin/firestore';
import { aggregateDailyFactsForDay } from './aggregateDailyFacts';
import { enrichDailyFactsWithBaselinesAndAverages } from './enrichDailyFacts';

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

const getYmdNDaysBefore = (date: YmdDateString, days: number): YmdDateString => {
  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() - days);
  return toYmdUtc(base);
};

/**
 * Scheduled job:
 *  - Runs daily (UTC)
 *  - Recomputes DailyFacts for the previous UTC day across all users
 *  - Enriches DailyFacts with 7-day rolling averages and HRV baselines
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/events/{eventId}
 *  - Output: /users/{userId}/dailyFacts/{yyyy-MM-dd}
 */
export const onDailyFactsRecomputeScheduled = onSchedule(
  {
    schedule: '0 3 * * *', // 03:00 UTC daily
    region: 'us-central1',
  },
  async () => {
    const targetDate = getYesterdayUtcYmd();
    const computedAt: IsoDateTimeString = new Date().toISOString();

    logger.info('DailyFacts recompute started', { targetDate });

    const eventsSnapshot = await db
      .collectionGroup('events')
      .where('day', '==', targetDate)
      .get();

    if (eventsSnapshot.empty) {
      logger.info('No events found for target date', { targetDate });
      return;
    }

    const eventsByUser = new Map<string, CanonicalEvent[]>();

    eventsSnapshot.docs.forEach((doc) => {
      const data = doc.data() as CanonicalEvent;
      const userEvents = eventsByUser.get(data.userId) ?? [];
      userEvents.push(data);
      eventsByUser.set(data.userId, userEvents);
    });

    const userIds = Array.from(eventsByUser.keys());

    const writePromises: Promise<WriteResult>[] = userIds.map(async (userId) => {
      const userEvents = eventsByUser.get(userId) ?? [];

      const baseDailyFacts: DailyFacts = aggregateDailyFactsForDay({
        userId,
        date: targetDate,
        computedAt,
        events: userEvents,
      });

      // Load previous up-to-6 days of DailyFacts (for a 7-day window including today).
      const startDate = getYmdNDaysBefore(targetDate, 6);
      const userRef = db.collection('users').doc(userId);

      const historySnapshot = await userRef
        .collection('dailyFacts')
        .where('date', '>=', startDate)
        .where('date', '<', targetDate) // strictly before today
        .get();

      const historyFacts: DailyFacts[] = historySnapshot.docs.map(
        (doc) => doc.data() as DailyFacts,
      );

      const enrichedDailyFacts = enrichDailyFactsWithBaselinesAndAverages({
        today: baseDailyFacts,
        history: historyFacts,
      });

      const ref = userRef.collection('dailyFacts').doc(targetDate);
      return ref.set(enrichedDailyFacts);
    });

    await Promise.all(writePromises);

    logger.info('DailyFacts recompute completed', {
      targetDate,
      userCount: eventsByUser.size,
    });
  },
);
