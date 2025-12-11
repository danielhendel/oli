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
 *  - Recomputes DailyFacts for the previous UTC day across all users
 *  - Uses CanonicalEvents (collectionGroup "events") as the source of truth
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

    const writePromises: Promise<WriteResult>[] = [];

    eventsByUser.forEach((userEvents, userId) => {
      const dailyFacts: DailyFacts = aggregateDailyFactsForDay({
        userId,
        date: targetDate,
        computedAt,
        events: userEvents,
      });

      const ref = db
        .collection('users')
        .doc(userId)
        .collection('dailyFacts')
        .doc(targetDate);

      writePromises.push(ref.set(dailyFacts));
    });

    await Promise.all(writePromises);

    logger.info('DailyFacts recompute completed', {
      targetDate,
      userCount: eventsByUser.size,
    });
  },
);
