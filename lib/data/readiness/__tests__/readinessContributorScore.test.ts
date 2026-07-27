import { describe, expect, it } from "@jest/globals";

import {
  mapReadinessRangeContributors,
  normalizeReadinessContributorScore,
  READINESS_RANGE_CONTRIBUTOR_KEYS,
} from "@/lib/data/readiness/readinessContributorScore";

describe("readinessContributorScore", () => {
  it("exposes only the four approved keys", () => {
    expect([...READINESS_RANGE_CONTRIBUTOR_KEYS]).toEqual([
      "hrv_balance",
      "body_temperature",
      "recovery_index",
      "sleep_balance",
    ]);
  });

  it("validates 0–100 unrounded scores and rejects invalid inputs", () => {
    expect(normalizeReadinessContributorScore(0)).toBe(0);
    expect(normalizeReadinessContributorScore(50)).toBe(50);
    expect(normalizeReadinessContributorScore(84.99)).toBe(84.99);
    expect(normalizeReadinessContributorScore(85)).toBe(85);
    expect(normalizeReadinessContributorScore(100)).toBe(100);
    expect(normalizeReadinessContributorScore(null)).toBeNull();
    expect(normalizeReadinessContributorScore(undefined)).toBeNull();
    expect(normalizeReadinessContributorScore(-0.01)).toBeNull();
    expect(normalizeReadinessContributorScore(101)).toBeNull();
    expect(normalizeReadinessContributorScore(Number.NaN)).toBeNull();
    expect(normalizeReadinessContributorScore(Number.NEGATIVE_INFINITY)).toBeNull();
    expect(normalizeReadinessContributorScore("50")).toBeNull();
    expect(normalizeReadinessContributorScore(true)).toBeNull();
  });

  it("never substitutes missing with zero when mapping", () => {
    const mapped = mapReadinessRangeContributors({
      hrv_balance: undefined,
      body_temperature: null,
      recovery_index: 80,
    });
    expect(mapped).toEqual({ recovery_index: 80 });
    expect(mapped).not.toHaveProperty("hrv_balance");
    expect(mapped).not.toHaveProperty("body_temperature");
  });
});
