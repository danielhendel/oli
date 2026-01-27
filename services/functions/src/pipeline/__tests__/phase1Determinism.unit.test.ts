// services/functions/src/pipeline/__tests__/phase1Determinism.unit.test.ts

import crypto from 'node:crypto';

import { stableStringify } from '../../ingestion/stableJson';
import { aggregateDailyFactsForDay } from '../../dailyFacts/aggregateDailyFacts';
import { enrichDailyFactsWithBaselinesAndAverages } from '../../dailyFacts/enrichDailyFacts';
import { generateInsightsForDailyFacts } from '../../insights/rules';
import { buildDailyIntelligenceContextDoc } from '../../intelligence/buildDailyIntelligenceContext';
import type { CanonicalEvent, DailyFacts } from '../../types/health';

const sha256 = (value: unknown): string =>
  crypto.createHash('sha256').update(stableStringify(value)).digest('hex');

/**
 * Phase 1 determinism (unit proof):
 * Given identical canonical inputs, Facts → Insights → IntelligenceContext must be identical.
 *
 * Scope:
 * - Pure functions only (no Firestore, no time)
 * - Hash-based equality to avoid deep compare noise
 */
describe('Phase 1 determinism (unit proof)', () => {
  it('produces stable hashes across reruns for Facts → Insights → Context', () => {
    const userId = 'user_test';
    const date = '2026-01-01' as const;
    const computedAt = '2026-01-02T00:00:00.000Z' as const;
    const now = '2026-01-02T00:00:00.000Z' as const;

    const events: CanonicalEvent[] = [
      {
        id: 'ev_sleep_1',
        userId,
        sourceId: 'source_test',
        kind: 'sleep',
        start: '2026-01-01T02:00:00.000Z',
        end: '2026-01-01T08:00:00.000Z',
        day: date,
        timezone: 'UTC',
        createdAt: computedAt,
        updatedAt: computedAt,
        schemaVersion: 1,
        totalMinutes: 360,
        efficiency: 0.85,
        latencyMinutes: 20,
        awakenings: 2,
        isMainSleep: true,
      },
      {
        id: 'ev_steps_1',
        userId,
        sourceId: 'source_test',
        kind: 'steps',
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-01-01T23:59:59.000Z',
        day: date,
        timezone: 'UTC',
        createdAt: computedAt,
        updatedAt: computedAt,
        schemaVersion: 1,
        steps: 5000,
        distanceKm: 3.8,
        moveMinutes: 42,
      },
      {
        id: 'ev_weight_1',
        userId,
        sourceId: 'source_test',
        kind: 'weight',
        start: '2026-01-01T12:00:00.000Z',
        end: '2026-01-01T12:00:00.000Z',
        day: date,
        timezone: 'UTC',
        createdAt: computedAt,
        updatedAt: computedAt,
        schemaVersion: 1,
        weightKg: 80.0,
        bodyFatPercent: 15.0,
      },
      {
        id: 'ev_hrv_1',
        userId,
        sourceId: 'source_test',
        kind: 'hrv',
        start: '2026-01-01T07:30:00.000Z',
        end: '2026-01-01T07:30:00.000Z',
        day: date,
        timezone: 'UTC',
        createdAt: computedAt,
        updatedAt: computedAt,
        schemaVersion: 1,
        rmssdMs: 42,
        measurementType: 'nightly',
      },
    ];

    const historyFacts: DailyFacts[] = [
      {
        userId,
        date: '2025-12-31',
        schemaVersion: 1,
        computedAt: '2026-01-01T00:00:00.000Z',
        activity: { steps: 9000 },
        recovery: { hrvRmssd: 55 },
      },
    ];

    const runOnce = () => {
      const facts = aggregateDailyFactsForDay({ userId, date, computedAt, events });
      const enriched = enrichDailyFactsWithBaselinesAndAverages({
        today: facts,
        history: historyFacts,
      });

      const insights = generateInsightsForDailyFacts({
        userId,
        date,
        today: enriched,
        history: historyFacts,
        now,
      });

      const ctx = buildDailyIntelligenceContextDoc({
        userId,
        date,
        computedAt,
        today: enriched,
        history: historyFacts,
        insightsForDay: insights,
        domainConfidenceThreshold: 0.5,
      });

      return {
        factsHash: sha256(enriched),
        insightsHash: sha256(insights),
        ctxHash: sha256(ctx),
      };
    };

    const a = runOnce();
    const b = runOnce();

    expect(a.factsHash).toBe(b.factsHash);
    expect(a.insightsHash).toBe(b.insightsHash);
    expect(a.ctxHash).toBe(b.ctxHash);
  });
});