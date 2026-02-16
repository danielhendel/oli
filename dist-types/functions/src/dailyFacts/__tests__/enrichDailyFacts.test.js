// services/functions/src/dailyFacts/__tests__/enrichDailyFacts.test.ts
import { describe, it, expect } from '@jest/globals';
import { enrichDailyFactsWithBaselinesAndAverages } from '../enrichDailyFacts';
const makeFacts = (overrides) => ({
    userId: 'user_123',
    date: '2025-01-07',
    computedAt: '2025-01-08T03:00:00.000Z',
    schemaVersion: 1,
    ...overrides,
});
describe('enrichDailyFactsWithBaselinesAndAverages', () => {
    it('computes 7-day rolling averages for steps and trainingLoad', () => {
        const history = [
            makeFacts({ date: '2025-01-01', activity: { steps: 4000, trainingLoad: 50 } }),
            makeFacts({ date: '2025-01-02', activity: { steps: 6000, trainingLoad: 60 } }),
            makeFacts({ date: '2025-01-03', activity: { steps: 8000, trainingLoad: 70 } }),
        ];
        const today = makeFacts({
            date: '2025-01-04',
            activity: { steps: 10000, trainingLoad: 80 },
        });
        const enriched = enrichDailyFactsWithBaselinesAndAverages({ today, history });
        expect(enriched.activity).toBeDefined();
        const activity = enriched.activity;
        // stepsAvg7d is average of [4000, 6000, 8000, 10000] = 7000
        expect(activity.stepsAvg7d).toBeCloseTo(7000);
        // trainingLoadAvg7d is average of [50, 60, 70, 80] = 65
        expect(activity.trainingLoadAvg7d).toBeCloseTo(65);
    });
    it('computes HRV baseline from history and deviation for today', () => {
        const history = [
            makeFacts({ date: '2025-01-01', recovery: { hrvRmssd: 80 } }),
            makeFacts({ date: '2025-01-02', recovery: { hrvRmssd: 100 } }),
            makeFacts({ date: '2025-01-03', recovery: { hrvRmssd: 120 } }),
        ];
        const today = makeFacts({
            date: '2025-01-04',
            recovery: { hrvRmssd: 60 },
        });
        const enriched = enrichDailyFactsWithBaselinesAndAverages({ today, history });
        expect(enriched.recovery).toBeDefined();
        const recovery = enriched.recovery;
        // Baseline is average of [80, 100, 120] = 100
        expect(recovery.hrvRmssdBaseline).toBeCloseTo(100);
        // Deviation is (today - baseline) / baseline = (60 - 100) / 100 = -0.4
        expect(recovery.hrvRmssdDeviation).toBeCloseTo(-0.4);
    });
    it('leaves derived averages undefined when there is no history', () => {
        const today = makeFacts({
            date: '2025-01-01',
            activity: { steps: 8000, trainingLoad: 50 },
            recovery: { hrvRmssd: 70 },
        });
        const enriched = enrichDailyFactsWithBaselinesAndAverages({ today, history: [] });
        expect(enriched.activity?.stepsAvg7d).toBeUndefined();
        expect(enriched.activity?.trainingLoadAvg7d).toBeUndefined();
        expect(enriched.recovery?.hrvRmssdBaseline).toBeUndefined();
        expect(enriched.recovery?.hrvRmssdDeviation).toBeUndefined();
        // But confidence should still be computed based on coverage over a 7-day window.
        // With only "today" having activity & recovery, confidence ~= 1/7.
        expect(enriched.confidence).toBeDefined();
        const confidence = enriched.confidence;
        expect(confidence.activity).toBeCloseTo(1 / 7);
        expect(confidence.recovery).toBeCloseTo(1 / 7);
    });
    it('computes domain-level confidence based on 7-day coverage', () => {
        // 4 days of history + today, all with sleep and activity
        const history = [
            makeFacts({ date: '2025-01-01', sleep: { totalMinutes: 400 }, activity: { steps: 4000 } }),
            makeFacts({ date: '2025-01-02', sleep: { totalMinutes: 420 }, activity: { steps: 6000 } }),
            makeFacts({ date: '2025-01-03', sleep: { totalMinutes: 430 }, activity: { steps: 7000 } }),
            makeFacts({ date: '2025-01-04', sleep: { totalMinutes: 410 }, activity: { steps: 5000 } }),
        ];
        const today = makeFacts({
            date: '2025-01-05',
            sleep: { totalMinutes: 450 },
            activity: { steps: 9000 },
        });
        const enriched = enrichDailyFactsWithBaselinesAndAverages({ today, history });
        expect(enriched.confidence).toBeDefined();
        const confidence = enriched.confidence;
        // 5 days out of a 7-day window have data for these domains => ~5/7
        expect(confidence.sleep).toBeCloseTo(5 / 7);
        expect(confidence.activity).toBeCloseTo(5 / 7);
    });
});
