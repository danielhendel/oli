// services/functions/src/http/recomputeInsightsAdminHttp.ts

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { db } from '../firebaseAdmin';
import type { DailyFacts, IsoDateTimeString, YmdDateString } from '../types/health';
import { generateInsightsForDailyFacts } from '../insights/rules';
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

const parseIntStrict = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseYmdUtc = (ymd: YmdDateString): Date => {
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

  return new Date(Date.UTC(y, m - 1, d));
};

const addDaysUtc = (ymd: YmdDateString, deltaDays: number): YmdDateString => {
  const base = parseYmdUtc(ymd);
  const next = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return toYmdUtc(next);
};

const buildWindowDatesInclusive = (endDate: YmdDateString, windowSizeDays: number): YmdDateString[] => {
  const dates: YmdDateString[] = [];
  for (let i = windowSizeDays - 1; i >= 0; i--) {
    dates.push(addDaysUtc(endDate, -i));
  }
  return dates;
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

const sortByDateAsc = (a: DailyFacts, b: DailyFacts): number => {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
};

/**
 * Admin-only HTTP endpoint
 * Recomputes Insights for a specific user + date using a 7-day DailyFacts window.
 *
 * Input:
 *  { "userId": "...", "date": "YYYY-MM-DD" }
 */
export const recomputeInsightsAdminHttp = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    const auth = await requireAdmin(req.header('authorization'));
    if (!auth.ok) {
      res.status(auth.status).json({ ok: false, error: auth.message });
      return;
    }

    const body = parseBody(req.body);
    if (!body) {
      res
        .status(400)
        .json({ ok: false, error: 'Invalid body. Expected { userId, date: YYYY-MM-DD }' });
      return;
    }

    const { userId, date } = body;
    const now: IsoDateTimeString = new Date().toISOString();

    try {
      const userRef = db.collection('users').doc(userId);

      const windowDates = buildWindowDatesInclusive(date, 7);

      const windowSnap = await userRef
        .collection('dailyFacts')
        .where('date', 'in', windowDates)
        .get();

      const windowFacts = windowSnap.docs.map((d) => d.data() as DailyFacts).sort(sortByDateAsc);

      const today = windowFacts.find((f) => f.date === date);
      if (!today) {
        res
          .status(404)
          .json({ ok: false, error: `DailyFacts not found for userId=${userId} date=${date}` });
        return;
      }

      const history = windowFacts.filter((f) => f.date !== date);

      const insights = generateInsightsForDailyFacts({
        userId,
        date,
        today,
        history,
        now,
      });

      const batch = db.batch();
      const insightsCol = userRef.collection('insights');

      for (const insight of insights) {
        batch.set(insightsCol.doc(insight.id), insight);
      }

      await batch.commit();

      logger.info('Admin recomputeInsights complete', { userId, date, insights: insights.length });

      res.status(200).json({
        ok: true,
        written: true,
        userId,
        date,
        insightsWritten: insights.length,
      });
    } catch (err) {
      logger.error('Admin recomputeInsights failed', { userId, date, err });
      res.status(500).json({ ok: false, error: 'Internal error recomputing Insights' });
    }
  },
);
