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
    expect(selectBodyFactsForDay([], { weight: "withings" })).toBeUndefined();
  });

  it("preferred source wins when both preferred and non-preferred exist for weight", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T14:00:00.000Z", "manual", 80, 18),
      e("2025-01-01T08:00:00.000Z", "withings", 79.5, 17),
    ];
    const result = selectBodyFactsForDay(events, {
      weight: "withings",
      body_fat_percent: "withings",
    });
    expect(result).toBeDefined();
    expect(result!.weightKg).toBe(79.5);
    expect(result!.bodyFatPercent).toBe(17);
  });

  it("latest event within preferred source wins for weight", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T07:00:00.000Z", "withings", 79),
      e("2025-01-01T20:00:00.000Z", "withings", 79.5),
      e("2025-01-01T12:00:00.000Z", "manual", 80),
    ];
    const result = selectBodyFactsForDay(events, { weight: "withings" });
    expect(result!.weightKg).toBe(79.5);
  });

  it("fallback to latest overall when preferred source has no matching event for weight", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T10:00:00.000Z", "manual", 80),
      e("2025-01-01T18:00:00.000Z", "manual", 80.2),
    ];
    const result = selectBodyFactsForDay(events, { weight: "withings" });
    expect(result!.weightKg).toBe(80.2);
  });

  it("weight and body fat resolved independently (e.g. weight from Withings, body fat from Manual)", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "withings", 79.5),
      e("2025-01-01T20:00:00.000Z", "manual", 80, 18),
    ];
    const result = selectBodyFactsForDay(events, {
      weight: "withings",
      body_fat_percent: "manual",
    });
    expect(result!.weightKg).toBe(79.5);
    expect(result!.bodyFatPercent).toBe(18);
  });

  it("uses latest by observedAt for tie-breaking", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "manual", 80),
      e("2025-01-01T08:00:00.001Z", "manual", 80.1),
    ];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBe(80.1);
  });

  it("deterministic: same input produces same output", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "withings", 79.5, 17),
      e("2025-01-01T20:00:00.000Z", "manual", 80, 18),
    ];
    const prefs = { weight: "withings", body_fat_percent: "manual" };
    const a = selectBodyFactsForDay(events, prefs);
    const b = selectBodyFactsForDay(events, prefs);
    expect(a).toEqual(b);
  });

  it("only weight when events have no body fat", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "manual", 80),
    ];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBe(80);
    expect(result!.bodyFatPercent).toBeUndefined();
  });

  it("only body fat when event has body fat but no valid weight (invalid weight skipped)", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "manual", 0, 18),
    ];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBeUndefined();
    expect(result!.bodyFatPercent).toBe(18);
  });

  it("ignores invalid body fat (out of range)", () => {
    const events: BodyRawEventForDay[] = [
      e("2025-01-01T08:00:00.000Z", "manual", 80, 101),
    ];
    const result = selectBodyFactsForDay(events, undefined);
    expect(result!.weightKg).toBe(80);
    expect(result!.bodyFatPercent).toBeUndefined();
  });
});
