import { describe, expect, it } from "@jest/globals";

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";

import {
  readinessRangeSupportsContributorHistory,
  readinessContributorHistoryUnavailableMessage,
} from "@/lib/data/readiness/readinessContributorHistoryContract";

function day(
  calendarDay: string,
  over: Partial<OuraReadinessRangeDayDto> = {},
): OuraReadinessRangeDayDto {
  return {
    day: calendarDay as OuraReadinessRangeDayDto["day"],
    score: 80,
    source: "oura",
    ...over,
  };
}

describe("readinessContributorHistoryContract", () => {
  it("accepts empty ranges (honest insufficient history later)", () => {
    expect(readinessRangeSupportsContributorHistory([])).toBe(true);
  });

  it("rejects pre-C1 scored days that omit contributors entirely", () => {
    const days = [
      day("2026-05-01"),
      day("2026-05-02"),
      day("2026-05-03"),
      day("2026-05-04"),
    ];
    expect(days.every((d) => d.contributors == null)).toBe(true);
    expect(readinessRangeSupportsContributorHistory(days)).toBe(false);
  });

  it("accepts ranges with approved contributor scores", () => {
    const days = [
      day("2026-05-01", {
        contributors: { hrv_balance: 80, body_temperature: 90, recovery_index: 70, sleep_balance: 75 },
      }),
      day("2026-05-02", {
        contributors: { hrv_balance: 81 },
      }),
    ];
    expect(readinessRangeSupportsContributorHistory(days)).toBe(true);
  });

  it("rejects scored ranges whose contributor objects lack approved keys", () => {
    const days = [
      day("2026-05-01", { contributors: {} }),
      day("2026-05-02", { contributors: {} }),
      day("2026-05-03", { contributors: {} }),
    ];
    expect(readinessRangeSupportsContributorHistory(days)).toBe(false);
  });

  it("exposes a non-technical unavailable message", () => {
    expect(readinessContributorHistoryUnavailableMessage()).toMatch(/Could not load/);
    expect(readinessContributorHistoryUnavailableMessage()).not.toMatch(
      /oura-readiness-range|DTO|Firestore|schema/i,
    );
  });
});
