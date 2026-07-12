import {
  OURA_STRESS_RANGE_MAX_DAYS,
  ouraDailyStressDayDtoSchema,
  ouraDailyStressProviderDocumentSchema,
  ouraStressRangeQuerySchema,
  ouraStressRangeResponseDtoSchema,
  ouraStressSnapshotSchema,
  parseOuraDailyStressProviderDocument,
} from "../ouraVendor";
import { countInclusiveCalendarDays } from "../workoutSummaryRebuildLimits";

describe("oura Daily Stress contracts", () => {
  it("parses provider daily_stress documents", () => {
    const parsed = parseOuraDailyStressProviderDocument({
      id: "x1",
      day: "2026-07-08",
      day_summary: "restored",
      stress_high: 120,
      recovery_high: 80,
    });
    expect(parsed).toEqual({
      id: "x1",
      day: "2026-07-08",
      day_summary: "restored",
      stress_high: 120,
      recovery_high: 80,
    });
  });

  it("rejects invalid provider day_summary", () => {
    const parsed = ouraDailyStressProviderDocumentSchema.safeParse({
      day: "2026-07-08",
      day_summary: "anxious",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts snapshot with schemaVersion 1 and camelCase fields", () => {
    const parsed = ouraStressSnapshotSchema.safeParse({
      id: "oura_daily_stress_2026-07-08",
      day: "2026-07-08",
      daySummary: "normal",
      stressHighSeconds: 100,
      recoveryHighSeconds: null,
      source: "oura",
      fetchedAt: "2026-07-08T12:00:00.000Z",
      schemaVersion: 1,
    });
    expect(parsed.success).toBe(true);
  });

  it("client day DTO omits storage metadata", () => {
    const parsed = ouraDailyStressDayDtoSchema.safeParse({
      day: "2026-07-08",
      daySummary: "stressful",
      stressHighSeconds: 200,
      recoveryHighSeconds: 10,
      source: "oura",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("fetchedAt");
      expect(parsed.data).not.toHaveProperty("payload");
      expect(parsed.data).not.toHaveProperty("schemaVersion");
    }
  });

  it("exports a 90-day inclusive policy max", () => {
    expect(OURA_STRESS_RANGE_MAX_DAYS).toBe(90);
  });

  it("parses start/end query", () => {
    const parsed = ouraStressRangeQuerySchema.safeParse({
      start: "2026-05-01",
      end: "2026-05-07",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts empty days response within dayCount", () => {
    const parsed = ouraStressRangeResponseDtoSchema.safeParse({
      start: "2026-05-01",
      end: "2026-05-07",
      dayCount: 7,
      resolvedCount: 0,
      days: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("dayCount matches inclusive calendar span helper", () => {
    expect(countInclusiveCalendarDays("2026-05-01", "2026-05-01")).toBe(1);
    expect(countInclusiveCalendarDays("2026-05-01", "2026-05-30")).toBe(30);
  });
});
