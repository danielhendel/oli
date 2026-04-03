// services/functions/src/dailyFacts/__tests__/selectBodyFactsForDay.test.ts

import { describe, it, expect } from "@jest/globals";
import {
  selectBodyFactsForDay,
  type BodyRawEventForDay,
} from "../selectBodyFactsForDay";

const e = (
  observedAt: string,
  sourceId: string,
  weightKg?: number,
  bodyFatPercent?: number,
): BodyRawEventForDay => ({
  observedAt,
  sourceId,
  ...(weightKg !== undefined ? { weightKg } : {}),
  ...(bodyFatPercent !== undefined ? { bodyFatPercent } : {}),
});

describe("selectBodyFactsForDay", () => {
  it("returns undefined when no events", () => {
    expect(selectBodyFactsForDay([], undefined)).toBeUndefined();
    expect(selectBodyFactsForDay([], { weight: "apple_health" })).toBeUndefined();
  });

  it("returns undefined when only non-Apple body events exist (e.g. manual, withings)", () => {
    expect(
      selectBodyFactsForDay(
        [e("2025-01-01T10:00:00.000Z", "manual", 80), e("2025-01-01T18:00:00.000Z", "manual", 80.2)],
        { weight: "apple_health" },
      ),
    ).toBeUndefined();
    expect(
      selectBodyFactsForDay([e("2025-01-01T10:00:00.000Z", "withings", 81)], { weight: "apple_health" }),
    ).toBeUndefined();
  });

  it("ignores withings when apple_health events exist for the same day", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T12:00:00.000Z", "withings", 999),
      e("2025-01-01T08:00:00.000Z", "apple_health", 79.5, 17),
    ];
    const result = selectBodyFactsForDay(events, {
      weight: "apple_health",
      body_fat_percent: "apple_health",
    });
    expect(result).toBeDefined();
    expect(result!.weightKg).toBe(79.5);
    expect(result!.bodyFatPercent).toBe(17);
  });

  it("latest Apple-eligible event wins when preference matches multiple sources (apple_health ∪ healthkit)", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "apple_health", 79.5, 17),
      e("2025-01-01T14:00:00.000Z", "healthkit", 80, 18),
    ];
    const result = selectBodyFactsForDay(events, {
      weight: "apple_health",
      body_fat_percent: "apple_health",
    });
    expect(result).toBeDefined();
    expect(result!.weightKg).toBe(80);
    expect(result!.bodyFatPercent).toBe(18);
  });

  it("latest event within preferred source wins for weight", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T07:00:00.000Z", "apple_health", 79),
      e("2025-01-01T20:00:00.000Z", "apple_health", 79.5),
    ];
    const result = selectBodyFactsForDay(events, { weight: "apple_health" });
    expect(result!.weightKg).toBe(79.5);
  });

  it("weight and body fat resolved independently from distinct apple_health events", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "apple_health", 79.5),
      e("2025-01-01T20:00:00.000Z", "apple_health", undefined, 18),
    ];
    const result = selectBodyFactsForDay(events, {
      weight: "apple_health",
      body_fat_percent: "manual",
    });
    expect(result!.weightKg).toBe(79.5);
    expect(result!.bodyFatPercent).toBe(18);
  });

  it("uses latest by observedAt for tie-breaking among Apple events", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "apple_health", 80),
      e("2025-01-01T08:00:00.001Z", "apple_health", 80.1),
    ];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBe(80.1);
  });

  it("deterministic: same input produces same output", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "apple_health", 79.5, 17),
      e("2025-01-01T20:00:00.000Z", "apple_health", 80, 18),
    ];
    const prefs = { weight: "apple_health", body_fat_percent: "manual" };
    const a = selectBodyFactsForDay(events, prefs);
    const b = selectBodyFactsForDay(events, prefs);
    expect(a).toEqual(b);
  });

  it("only weight when events have no body fat", () => {
    const events: BodyRawEventForDay[] = [e("2025-01-01T08:00:00.000Z", "apple_health", 80)];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBe(80);
    expect(result!.bodyFatPercent).toBeUndefined();
  });

  it("only body fat when event has body fat but no valid weight (invalid weight skipped)", () => {
    const events: BodyRawEventForDay[] = [e("2025-01-01T08:00:00.000Z", "apple_health", 0, 18)];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBeUndefined();
    expect(result!.bodyFatPercent).toBe(18);
  });

  it("ignores invalid body fat (out of range)", () => {
    const events: BodyRawEventForDay[] = [e("2025-01-01T08:00:00.000Z", "apple_health", 80, 101)];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBe(80);
    expect(result!.bodyFatPercent).toBeUndefined();
  });

  it("selects bmi, lean mass, and rmr from Apple body composition events", () => {
    const events: BodyRawEventForDay[] = [
      {
        observedAt: "2025-01-01T08:00:00.000Z",
        sourceId: "apple_health",
        bmi: 24.1,
        leanBodyMassKg: 61.4,
        restingMetabolicRateKcal: 1710,
      },
    ];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.bmi).toBe(24.1);
    expect(result!.leanBodyMassKg).toBe(61.4);
    expect(result!.restingMetabolicRateKcal).toBe(1710);
  });

  it("resolves bmi source preference independently from weight among Apple events", () => {
    const events: BodyRawEventForDay[] = [
      { observedAt: "2025-01-01T08:00:00.000Z", sourceId: "healthkit", bmi: 23.8, weightKg: 80 },
      { observedAt: "2025-01-01T09:00:00.000Z", sourceId: "apple_health", bmi: 24.2, weightKg: 79.8 },
    ];
    const result = selectBodyFactsForDay(events, { weight: "apple_health", bmi: "healthkit" });
    expect(result!.weightKg).toBe(79.8);
    expect(result!.bmi).toBe(23.8);
  });

  it("treats legacy healthkit source id as apple_health preference", () => {
    const events: BodyRawEventForDay[] = [
      { observedAt: "2025-01-01T08:00:00.000Z", sourceId: "healthkit", weightKg: 79.2 },
      { observedAt: "2025-01-01T09:00:00.000Z", sourceId: "healthkit", weightKg: 79.4 },
    ];
    const result = selectBodyFactsForDay(events, { weight: "apple_health" });
    expect(result!.weightKg).toBe(79.4);
  });
});
