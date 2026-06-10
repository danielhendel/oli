// lib/features/profile/digitalTwin/__fixtures__/twinFixtures.ts
// Shared test fixtures for Digital Twin VM builders. Not collected by Jest (outside __tests__).
import type {
  DailyFactsDto,
  HealthScoreDoc,
  HealthSignalDoc,
  InsightsResponseDto,
} from "@/lib/contracts";
import type { TwinDataContext } from "@/lib/features/profile/digitalTwin/types";

export function emptyCtx(overrides: Partial<TwinDataContext> = {}): TwinDataContext {
  return {
    healthScore: { status: "missing" },
    healthSignals: { status: "missing" },
    insights: { status: "missing" },
    intelligence: { status: "missing" },
    dailyFacts: { status: "missing" },
    profile: null,
    labs: { status: "partial" },
    uploads: { status: "partial" },
    failures: { status: "partial" },
    massUnit: "lb",
    lengthUnit: "in",
    signedOut: false,
    ...overrides,
  };
}

export function healthScoreDoc(overrides: Partial<HealthScoreDoc> = {}): HealthScoreDoc {
  const domain = (score: number, tier: HealthScoreDoc["compositeTier"]) => ({
    score,
    tier,
    missing: [] as string[],
  });
  return {
    schemaVersion: 1,
    modelVersion: "1.0",
    date: "2026-06-09",
    compositeScore: 82,
    compositeTier: "good",
    domainScores: {
      recovery: domain(85, "good"),
      training: domain(70, "fair"),
      nutrition: domain(90, "excellent"),
      body: domain(60, "fair"),
    },
    status: "stable",
    computedAt: "2026-06-09T08:00:00.000Z",
    pipelineVersion: 1,
    inputs: { hasDailyFacts: true, historyDaysUsed: 30 },
    ...overrides,
  };
}

export function healthSignalDoc(overrides: Partial<HealthSignalDoc> = {}): HealthSignalDoc {
  const evidence = { score: 80, baselineMean: 80, deviationPct: 0 };
  return {
    schemaVersion: 1,
    modelVersion: "1.0",
    date: "2026-06-09",
    status: "stable",
    readiness: "ready",
    computedAt: "2026-06-09T08:00:00.000Z",
    pipelineVersion: 1,
    inputs: {
      healthScoreDayKey: "2026-06-09",
      baselineWindowDays: 14,
      baselineDaysPresent: 14,
      thresholds: {
        compositeAttentionLt: 50,
        domainAttentionLt: 50,
        deviationAttentionPctLt: -15,
      },
    },
    reasons: [],
    missingInputs: [],
    domainEvidence: {
      recovery: { ...evidence },
      training: { ...evidence },
      nutrition: { ...evidence },
      body: { ...evidence },
    },
    ...overrides,
  };
}

export function dailyFacts(overrides: Partial<DailyFactsDto> = {}): DailyFactsDto {
  return {
    schemaVersion: 1,
    userId: "u1",
    date: "2026-06-09",
    computedAt: "2026-06-09T08:00:00.000Z",
    recovery: { hrvRmssd: 62, restingHeartRate: 54 },
    activity: { steps: 8200, moveMinutes: 41, trainingLoad: 120 },
    body: { weightKg: 72, bodyFatPercent: 18.4, bmi: 23.1, leanBodyMassKg: 58.7 },
    nutrition: { totalKcal: 2100, proteinG: 150, carbsG: 210, fatG: 70, fiberG: 28 },
    sleep: { totalMinutes: 462 },
    ...overrides,
  } as DailyFactsDto;
}

export function insights(items: InsightsResponseDto["items"]): InsightsResponseDto {
  return { day: "2026-06-09", count: items.length, items };
}

export function insightItem(
  overrides: Partial<InsightsResponseDto["items"][number]> = {},
): InsightsResponseDto["items"][number] {
  return {
    schemaVersion: 1,
    id: "i1",
    userId: "u1",
    date: "2026-06-09",
    kind: "sleep_short",
    title: "Sleep was short",
    message: "You slept less than usual.",
    severity: "warning",
    evidence: [],
    tags: ["sleep"],
    createdAt: "2026-06-09T08:00:00.000Z",
    updatedAt: "2026-06-09T08:00:00.000Z",
    ruleVersion: "1.0",
    ...overrides,
  };
}
