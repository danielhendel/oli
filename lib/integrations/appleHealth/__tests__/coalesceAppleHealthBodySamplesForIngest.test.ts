import { describe, it, expect } from "@jest/globals";
import { coalesceAppleHealthBodySamplesForIngest } from "../healthKit";

const LA = "America/Los_Angeles";

describe("coalesceAppleHealthBodySamplesForIngest", () => {
  it("merges BMI / lean / RMR from different timestamps onto the latest same-day weight row", () => {
    const out = coalesceAppleHealthBodySamplesForIngest(
      [
        {
          observedAt: "2026-04-03T17:00:00.000Z",
          sourceId: null,
          weightKg: 80,
          bodyFatPercent: 18,
        },
        {
          observedAt: "2026-04-04T01:00:00.000Z",
          sourceId: null,
          bmi: 23.1,
        },
        {
          observedAt: "2026-04-04T01:30:00.000Z",
          sourceId: null,
          leanBodyMassKg: 62.2,
          restingMetabolicRateKcal: 1650,
        },
      ],
      LA,
    );

    expect(out).toHaveLength(1);
    const row = out[0]!;
    expect(row.weightKg).toBe(80);
    expect(row.bodyFatPercent).toBe(18);
    expect(row.bmi).toBe(23.1);
    expect(row.leanBodyMassKg).toBe(62.2);
    expect(row.restingMetabolicRateKcal).toBe(1650);
    expect(row.observedAt).toBe("2026-04-03T17:00:00.000Z");
  });

  it("keeps multiple weight rows on the same day; only the latest gets cross-sample composition", () => {
    const out = coalesceAppleHealthBodySamplesForIngest(
      [
        {
          observedAt: "2026-04-03T15:00:00.000Z",
          sourceId: null,
          weightKg: 81,
        },
        {
          observedAt: "2026-04-03T22:00:00.000Z",
          sourceId: null,
          weightKg: 80.5,
        },
        {
          observedAt: "2026-04-03T23:00:00.000Z",
          sourceId: null,
          bmi: 22,
        },
      ],
      LA,
    );

    expect(out).toHaveLength(2);
    expect(out[0]!.weightKg).toBe(81);
    expect(out[0]!.bmi).toBeUndefined();
    expect(out[1]!.weightKg).toBe(80.5);
    expect(out[1]!.bmi).toBe(22);
  });

  it("composition-only day merges into one row with latest observedAt", () => {
    const out = coalesceAppleHealthBodySamplesForIngest(
      [
        { observedAt: "2026-04-03T10:00:00.000Z", sourceId: null, bmi: 21 },
        { observedAt: "2026-04-03T20:00:00.000Z", sourceId: null, leanBodyMassKg: 60 },
      ],
      LA,
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.observedAt).toBe("2026-04-03T20:00:00.000Z");
    expect(out[0]!.bmi).toBe(21);
    expect(out[0]!.leanBodyMassKg).toBe(60);
  });
});
