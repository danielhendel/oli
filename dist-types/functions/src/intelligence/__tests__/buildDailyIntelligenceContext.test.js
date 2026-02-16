// services/functions/src/intelligence/__tests__/buildDailyIntelligenceContext.test.ts
import { describe, it, expect } from '@jest/globals';
import { buildDailyIntelligenceContext } from '../buildDailyIntelligenceContext';
describe('buildDailyIntelligenceContext', () => {
    it('is deterministic and produces sorted unique tags/kinds/ids', () => {
        const userId = 'u1';
        const date = '2025-01-01';
        const computedAt = '2025-01-01T00:00:00.000Z';
        const today = {
            schemaVersion: 1,
            userId,
            date,
            computedAt,
            confidence: {
                sleep: 0.9,
                activity: 0.8,
            },
            sleep: { totalMinutes: 360 },
            activity: { steps: 3000, trainingLoad: 0 },
            recovery: {},
            nutrition: {},
            body: {},
        };
        const insights = [
            {
                schemaVersion: 1,
                ruleVersion: 'insights-rules-v1.0.0',
                id: '2025-01-01_low_steps',
                userId,
                date,
                kind: 'low_steps',
                severity: 'warning',
                title: 'Low steps',
                message: 'Steps were below target.',
                tags: ['activity', 'steps', 'activity'], // dupe on purpose
                evidence: [],
                createdAt: computedAt,
                updatedAt: computedAt,
            },
            {
                schemaVersion: 1,
                ruleVersion: 'insights-rules-v1.0.0',
                id: '2025-01-01_low_sleep_duration',
                userId,
                date,
                kind: 'low_sleep_duration',
                severity: 'info',
                title: 'Low sleep duration',
                message: 'Sleep duration was below target.',
                tags: ['sleep', 'duration'],
                evidence: [],
                createdAt: computedAt,
                updatedAt: computedAt,
            },
        ];
        const a = buildDailyIntelligenceContext({
            userId,
            date,
            computedAt,
            today,
            insightsForDay: insights,
            history: [],
        });
        const b = buildDailyIntelligenceContext({
            userId,
            date,
            computedAt,
            today,
            insightsForDay: insights,
            history: [],
        });
        // Deterministic output
        expect(a).toEqual(b);
        // Sorted + unique
        expect(a.insights.tags).toEqual(['activity', 'duration', 'sleep', 'steps']);
        expect(a.insights.kinds).toEqual(['low_sleep_duration', 'low_steps']);
        expect(a.insights.ids).toEqual(['2025-01-01_low_sleep_duration', '2025-01-01_low_steps']);
        // Builder returns all severities (stable shape)
        expect(a.insights.bySeverity).toEqual({ info: 1, warning: 1, critical: 0 });
    });
});
