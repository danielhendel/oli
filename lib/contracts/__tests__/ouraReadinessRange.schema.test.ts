import {
  OURA_READINESS_RANGE_MAX_DAYS,
  mapReadinessRangeContributors,
  normalizeReadinessContributorScore,
  ouraReadinessRangeDayDtoSchema,
  ouraReadinessRangeQuerySchema,
  ouraReadinessRangeResponseDtoSchema,
  READINESS_RANGE_CONTRIBUTOR_KEYS,
} from "../ouraVendor";

describe("oura readiness range contributor contract", () => {
  it("exports approved contributor keys only", () => {
    expect([...READINESS_RANGE_CONTRIBUTOR_KEYS]).toEqual([
      "hrv_balance",
      "body_temperature",
      "recovery_index",
      "sleep_balance",
    ]);
  });

  it("preserves existing day fields and accepts optional contributors", () => {
    const without = ouraReadinessRangeDayDtoSchema.safeParse({
      day: "2026-05-18",
      score: 82,
      source: "oura",
    });
    expect(without.success).toBe(true);

    const withContributors = ouraReadinessRangeDayDtoSchema.safeParse({
      day: "2026-05-18",
      score: 82,
      source: "oura",
      contributors: {
        hrv_balance: 84.99,
        body_temperature: 90,
        recovery_index: 70,
        sleep_balance: 0,
      },
    });
    expect(withContributors.success).toBe(true);
    if (withContributors.success) {
      expect(withContributors.data.contributors?.hrv_balance).toBe(84.99);
      expect(withContributors.data.contributors?.sleep_balance).toBe(0);
    }
  });

  it("rejects unrelated contributor keys under strict contributors schema", () => {
    const leaked = ouraReadinessRangeDayDtoSchema.safeParse({
      day: "2026-05-18",
      score: 80,
      source: "oura",
      contributors: {
        hrv_balance: 80,
        resting_heart_rate: 75,
        temperature_deviation: 0.1,
      },
    });
    expect(leaked.success).toBe(false);
  });

  it("maps only approved keys and omits invalid / missing (never zero)", () => {
    expect(
      mapReadinessRangeContributors({
        hrv_balance: 84.99,
        body_temperature: null,
        recovery_index: 101,
        sleep_balance: "80",
        resting_heart_rate: 70,
        temperature_deviation: 0.2,
        sleep: 90,
      }),
    ).toEqual({ hrv_balance: 84.99 });

    expect(mapReadinessRangeContributors(undefined)).toBeUndefined();
    expect(mapReadinessRangeContributors({})).toBeUndefined();
    expect(mapReadinessRangeContributors({ sleep: 90 })).toBeUndefined();
  });

  it("normalizer fail-closed contract", () => {
    expect(normalizeReadinessContributorScore(0)).toBe(0);
    expect(normalizeReadinessContributorScore(50)).toBe(50);
    expect(normalizeReadinessContributorScore(84.99)).toBe(84.99);
    expect(normalizeReadinessContributorScore(85)).toBe(85);
    expect(normalizeReadinessContributorScore(100)).toBe(100);
    expect(normalizeReadinessContributorScore(null)).toBeNull();
    expect(normalizeReadinessContributorScore(undefined)).toBeNull();
    expect(normalizeReadinessContributorScore(-1)).toBeNull();
    expect(normalizeReadinessContributorScore(100.1)).toBeNull();
    expect(normalizeReadinessContributorScore(Number.NaN)).toBeNull();
    expect(normalizeReadinessContributorScore(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeReadinessContributorScore("85")).toBeNull();
    expect(normalizeReadinessContributorScore(0.85)).toBe(0.85);
  });

  it("exports 90-day max and accepts empty days response", () => {
    expect(OURA_READINESS_RANGE_MAX_DAYS).toBe(90);
    expect(ouraReadinessRangeQuerySchema.safeParse({ start: "2026-05-01", end: "2026-05-07" }).success).toBe(
      true,
    );
    const empty = ouraReadinessRangeResponseDtoSchema.safeParse({
      start: "2026-05-01",
      end: "2026-05-07",
      dayCount: 7,
      resolvedCount: 0,
      days: [],
    });
    expect(empty.success).toBe(true);
  });

  it("response days must not require contributors (backward compatible)", () => {
    const parsed = ouraReadinessRangeResponseDtoSchema.safeParse({
      start: "2026-05-01",
      end: "2026-05-02",
      dayCount: 2,
      resolvedCount: 1,
      days: [{ day: "2026-05-01", score: 70, source: "oura" }],
    });
    expect(parsed.success).toBe(true);
  });
});
