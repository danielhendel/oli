// services/functions/src/insights/__tests__/rules.test.ts

import { describe, it, expect } from '@jest/globals';
import type { DailyFacts } from '../../types/health';
import { generateInsightsForDailyFacts } from '../rules';

const baseFacts: Omit<DailyFacts, 'userId' | 'date' | 'computedAt'> = {
  schemaVersion: 1,
};

const makeFacts = (overrides: Partial<DailyFacts>): DailyFacts => ({
  userId: 'user_123',
  date: '2025-01-01',
  computedAt: '2025-01-02T03:00:00.000Z',
  ...baseFacts,
  ...overrides,
});

describe('generateInsightsForDailyFacts', () => {
  it('generates low_sleep_duration when totalMinutes < 420', () => {
    const facts = makeFacts({
      sleep: {
        totalMinutes: 360,
      },
    });

    const insights = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    const lowSleep = insights.find((i) => i.kind === 'low_sleep_duration');
    expect(lowSleep).toBeDefined();
    expect(lowSleep?.severity).toBe('warning');
    expect(lowSleep?.evidence[0]?.factPath).toBe('sleep.totalMinutes');
  });

  it('does not generate low_sleep_duration when totalMinutes >= 420', () => {
    const facts = makeFacts({
      sleep: {
        totalMinutes: 450,
      },
    });

    const insights = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    const lowSleep = insights.find((i) => i.kind === 'low_sleep_duration');
    expect(lowSleep).toBeUndefined();
  });

  it('generates low_steps when steps < 8000', () => {
    const facts = makeFacts({
      activity: {
        steps: 5000,
      },
    });

    const insights = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    const lowSteps = insights.find((i) => i.kind === 'low_steps');
    expect(lowSteps).toBeDefined();
    expect(lowSteps?.severity).toBe('info');
    expect(lowSteps?.evidence[0]?.factPath).toBe('activity.steps');
  });

  it('generates high_training_load when trainingLoad > 150', () => {
    const facts = makeFacts({
      activity: {
        trainingLoad: 200,
      },
    });

    const insights = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    const highLoad = insights.find((i) => i.kind === 'high_training_load');
    expect(highLoad).toBeDefined();
    expect(highLoad?.severity).toBe('warning');
  });

  it('generates low_hrv when hrvRmssd < 50', () => {
    const facts = makeFacts({
      recovery: {
        hrvRmssd: 40,
      },
    });

    const insights = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    const lowHrv = insights.find((i) => i.kind === 'low_hrv');
    expect(lowHrv).toBeDefined();
    expect(lowHrv?.severity).toBe('info');
    expect(lowHrv?.evidence[0]?.factPath).toBe('recovery.hrvRmssd');
  });

  it('generates no insights when facts are empty', () => {
    const facts = makeFacts({});

    const insights = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    expect(insights.length).toBe(0);
  });

  it('produces deterministic IDs per date + rule kind', () => {
    const facts = makeFacts({
      sleep: { totalMinutes: 360 },
      activity: { steps: 5000, trainingLoad: 200 },
      recovery: { hrvRmssd: 40 },
    });

    const first = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-02T03:00:00.000Z',
    });

    const second = generateInsightsForDailyFacts({
      userId: facts.userId,
      date: facts.date,
      facts,
      now: '2025-01-03T03:00:00.000Z',
    });

    const kinds = ['low_sleep_duration', 'low_steps', 'high_training_load', 'low_hrv'] as const;

    kinds.forEach((kind) => {
      const firstInsight = first.find((i) => i.kind === kind);
      const secondInsight = second.find((i) => i.kind === kind);

      if (!firstInsight || !secondInsight) {
        throw new Error(`Expected insight of kind ${kind}`);
      }

      expect(firstInsight.id).toBe(secondInsight.id);
    });
  });
});
