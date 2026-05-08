import type { DailyFactsDto } from "@/lib/contracts";
import type { HealthScoreDoc } from "@/lib/contracts";

import {
  EMPTY_METRIC_PLACEHOLDER,
  buildSleepRecoveryAccessibilityLabel,
  buildSleepRecoverySummaryModel,
  buildTodayHealthHeroViewModel,
  formatSleepDurationCompact,
  greetingHeadline,
  greetingPeriodForLocalHour,
  pickSleepMinutesFromFacts,
} from "../todayHealthHero";

describe("greetingHeadline", () => {
  it("returns morning between 5 and 11", () => {
    const d = new Date("2026-05-07T09:00:00");
    expect(greetingHeadline(d)).toEqual({ period: "morning", phrase: "Good morning" });
  });

  it("returns afternoon from noon to 16:59", () => {
    const d = new Date("2026-05-07T14:30:00");
    expect(greetingHeadline(d)).toEqual({ period: "afternoon", phrase: "Good afternoon" });
  });

  it("returns evening otherwise", () => {
    const d = new Date("2026-05-07T20:00:00");
    expect(greetingHeadline(d)).toEqual({ period: "evening", phrase: "Good evening" });
  });
});

describe("greetingPeriodForLocalHour", () => {
  it("maps hours to periods", () => {
    expect(greetingPeriodForLocalHour(4)).toBe("evening");
    expect(greetingPeriodForLocalHour(5)).toBe("morning");
    expect(greetingPeriodForLocalHour(11)).toBe("morning");
    expect(greetingPeriodForLocalHour(12)).toBe("afternoon");
    expect(greetingPeriodForLocalHour(16)).toBe("afternoon");
    expect(greetingPeriodForLocalHour(17)).toBe("evening");
  });
});

describe("pickSleepMinutesFromFacts", () => {
  it("prefers totalMinutes over mainSleepMinutes", () => {
    expect(pickSleepMinutesFromFacts({ totalMinutes: 480, mainSleepMinutes: 400 })).toBe(480);
  });

  it("falls back to mainSleepMinutes", () => {
    expect(pickSleepMinutesFromFacts({ mainSleepMinutes: 450 })).toBe(450);
  });
});

describe("formatSleepDurationCompact", () => {
  it("formats hours and minutes", () => {
    expect(formatSleepDurationCompact(492)).toBe("8h 12m");
  });
});

describe("buildSleepRecoveryAccessibilityLabel", () => {
  it("builds the summary sentence", () => {
    expect(
      buildSleepRecoveryAccessibilityLabel({
        sleepMinutes: 492,
        recoveryTier: "good",
      }),
    ).toBe("Last night summary. Sleep 8 hours 12 minutes. Recovery good.");
  });

  it("handles missing sleep and recovery", () => {
    expect(
      buildSleepRecoveryAccessibilityLabel({
        sleepMinutes: undefined,
        recoveryTier: undefined,
      }),
    ).toBe("Last night summary. Sleep not available. Recovery not available.");
  });
});

describe("buildSleepRecoverySummaryModel", () => {
  it("returns placeholder while loading", () => {
    const m = buildSleepRecoverySummaryModel({
      loading: true,
      dailyFactsSettled: false,
      healthSettled: false,
      dailyFacts: undefined,
      healthScore: undefined,
    });
    expect(m.loading).toBe(true);
    expect(m.accessibilityLabel).toBe("Loading last night summary.");
  });

  it("shows em dash when settled but missing data", () => {
    const m = buildSleepRecoverySummaryModel({
      loading: false,
      dailyFactsSettled: true,
      healthSettled: true,
      dailyFacts: undefined,
      healthScore: undefined,
    });
    expect(m.sleepDisplay).toBe(EMPTY_METRIC_PLACEHOLDER);
    expect(m.recoveryDisplay).toBe(EMPTY_METRIC_PLACEHOLDER);
  });
});

describe("buildTodayHealthHeroViewModel", () => {
  /** Local afternoon — avoids TZ-dependent greeting period. */
  const now = new Date(2026, 4, 7, 14, 30, 0);

  const minimalFacts = (): DailyFactsDto =>
    ({
      schemaVersion: 1,
      userId: "u",
      date: "2026-05-07",
      computedAt: "2026-05-07T12:00:00.000Z",
      confidence: {},
      sleep: { totalMinutes: 480 },
    }) as DailyFactsDto;

  const minimalHealth = (): HealthScoreDoc =>
    ({
      schemaVersion: 1,
      modelVersion: "1.0",
      date: "2026-05-07",
      compositeScore: 80,
      compositeTier: "good",
      domainScores: {
        recovery: { score: 82, tier: "good", missing: [] },
        training: { score: 70, tier: "fair", missing: [] },
        nutrition: { score: 60, tier: "fair", missing: [] },
        body: { score: 75, tier: "good", missing: [] },
      },
      status: "stable",
      computedAt: "2026-05-07T12:00:00.000Z",
      pipelineVersion: 1,
      inputs: { hasDailyFacts: true, historyDaysUsed: 7 },
    }) as HealthScoreDoc;

  it("includes sleep and recovery when data exists", () => {
    const vm = buildTodayHealthHeroViewModel({
      now,
      dateLocale: "en-US",
      firstName: "Daniel",
      dailyFacts: minimalFacts(),
      dailyFactsSettled: true,
      healthScore: minimalHealth(),
      healthSettled: true,
      headerLoading: false,
      sleepRecoveryLoading: false,
    });
    expect(vm.greetingPhrase).toBe("Good afternoon");
    expect(vm.firstName).toBe("Daniel");
    expect(vm.sleepRecovery.sleepDisplay).toBe("8h 0m");
    expect(vm.sleepRecovery.recoveryDisplay).toBe("Good");
    expect(vm.loading).toBe(false);
  });
});
