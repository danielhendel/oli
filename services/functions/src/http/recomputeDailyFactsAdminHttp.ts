// services/functions/src/http/recomputeDailyFactsAdminHttp.ts

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { db } from '../firebaseAdmin';
import type { CanonicalEvent, DailyFacts, IsoDateTimeString, YmdDateString } from '../types/health';
import { aggregateDailyFactsForDay } from '../dailyFacts/aggregateDailyFacts';
import { enrichDailyFactsWithBaselinesAndAverages } from '../dailyFacts/enrichDailyFacts';
import { requireAdmin } from './adminAuth';

const isYmd = (value: unknown): value is YmdDateString =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const toYmdUtc = (date: Date): YmdDateString => {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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

type Body = {
  userId: string;
  date: YmdDateString;
};

const parseBody = (raw: unknown): Body | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const userId = obj['userId'];
  const date = obj['date'];

  if (!isNonEmptyString(userId)) return null;
  if (!isYmd(date)) return null;

  return { userId, date };
};

/**
 * Admin-only HTTP endpoint
 * Recomputes DailyFacts for a specific user + date.
 *
 * Input:
 *  { "userId": "...", "date": "YYYY-MM-DD" }
 *
 * Output:
 *  { ok: true, written: true, path: "...", date: "...", userId: "..." }
 */
export const recomputeDailyFactsAdminHttp = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
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
    const computedAt: IsoDateTimeString = new Date().toISOString();

    try {
      // Load canonical events for that user+day
      const userRef = db.collection('users').doc(userId);
      const eventsSnap = await userRef.collection('events').where('day', '==', date).get();
      const events: CanonicalEvent[] = eventsSnap.docs.map((d) => d.data() as CanonicalEvent);

      const base: DailyFacts = aggregateDailyFactsForDay({
        userId,
        date,
        computedAt,
        events,
      });

      // Load up-to-6 prior days for enrichment window
      const startDate = getYmdNDaysBefore(date, 6);

      const historySnap = await userRef
        .collection('dailyFacts')
        .where('date', '>=', startDate)
        .where('date', '<', date)
        .get();

      const history: DailyFacts[] = historySnap.docs.map((d) => d.data() as DailyFacts);

      const enriched = enrichDailyFactsWithBaselinesAndAverages({ today: base, history });

      const ref = userRef.collection('dailyFacts').doc(date);
      await ref.set(enriched);

      logger.info('Admin recomputeDailyFacts complete', { userId, date });

      res.status(200).json({
        ok: true,
        written: true,
        userId,
        date,
        path: ref.path,
      });
    } catch (err) {
      logger.error('Admin recomputeDailyFacts failed', { userId, date, err });
      res.status(500).json({ ok: false, error: 'Internal error recomputing DailyFacts' });
    }
  },
);
