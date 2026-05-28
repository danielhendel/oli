import { describe, expect, it } from "@jest/globals";

import {
  buildSleepBaselineExplainerCopy,
  computeSleepBaselineSevenNightTrendPct,
  SLEEP_BASELINE_GENERIC_EXPLAINER,
  type SleepBaselineRow,
} from "@/lib/data/sleep/buildSleepBaselineVm";

function row(input: {
  key: SleepBaselineRow["key"];
  label: SleepBaselineRow["label"];
  hasEnoughData: boolean;
  averageMinutes: number | null;
  displayValue?: string;
  statusLabel?: string | null;
}): SleepBaselineRow {
  return {
    key: input.key,
    label: input.label,
    hasEnoughData: input.hasEnoughData,
    averageMinutes: input.averageMinutes,
    displayValue: input.displayValue ?? "—",
    statusLabel: input.statusLabel ?? null,
    statusColor: null,
    statusBackgroundColor: null,
    progressFill01: null,
  };
}

describe("computeSleepBaselineSevenNightTrendPct", () => {
  it("returns null when baseline ≤ 0 or non-finite", () => {
    expect(computeSleepBaselineSevenNightTrendPct(420, 0)).toBeNull();
    expect(computeSleepBaselineSevenNightTrendPct(420, Number.NaN)).toBeNull();
    expect(computeSleepBaselineSevenNightTrendPct(Number.NaN, 420)).toBeNull();
  });

  it("rounds delta to whole percent, preserving sign", () => {
    expect(computeSleepBaselineSevenNightTrendPct(440, 420)).toBe(5);
    expect(computeSleepBaselineSevenNightTrendPct(400, 420)).toBe(-5);
    expect(computeSleepBaselineSevenNightTrendPct(420, 420)).toBe(0);
  });
});

describe("buildSleepBaselineExplainerCopy", () => {
  it("falls back to the generic copy when 90 Day has no data", () => {
    const copy = buildSleepBaselineExplainerCopy({
      day90Row: row({ key: "day90", label: "90 Day", hasEnoughData: false, averageMinutes: null }),
      day7Row: row({ key: "day7", label: "7 Day", hasEnoughData: true, averageMinutes: 450 }),
    });
    expect(copy).toBe(SLEEP_BASELINE_GENERIC_EXPLAINER);
  });

  it("returns baseline-only sentence when 7 Day has no data", () => {
    const copy = buildSleepBaselineExplainerCopy({
      day90Row: row({
        key: "day90",
        label: "90 Day",
        hasEnoughData: true,
        averageMinutes: 7 * 60 + 30,
        statusLabel: "Optimal",
      }),
      day7Row: row({ key: "day7", label: "7 Day", hasEnoughData: false, averageMinutes: null }),
    });
    expect(copy).toBe(
      "Your 90-day sleep baseline is 7h 30m/night, which puts you in the Optimal range.",
    );
  });

  it("composes baseline + above-trend sentence when 7 Day exceeds baseline", () => {
    const copy = buildSleepBaselineExplainerCopy({
      day90Row: row({
        key: "day90",
        label: "90 Day",
        hasEnoughData: true,
        averageMinutes: 7 * 60,
        statusLabel: "Good",
      }),
      day7Row: row({
        key: "day7",
        label: "7 Day",
        hasEnoughData: true,
        averageMinutes: 7 * 60 + 35,
      }),
    });
    expect(copy).toBe(
      "Your 90-day sleep baseline is 7h/night, which puts you in the Good range. Over the past 7 completed nights, you're averaging 7h 35m/night — about 8% above your baseline.",
    );
  });

  it("composes below-trend sentence when 7 Day is under baseline", () => {
    const copy = buildSleepBaselineExplainerCopy({
      day90Row: row({
        key: "day90",
        label: "90 Day",
        hasEnoughData: true,
        averageMinutes: 7 * 60,
        statusLabel: "Good",
      }),
      day7Row: row({
        key: "day7",
        label: "7 Day",
        hasEnoughData: true,
        averageMinutes: 6 * 60,
      }),
    });
    expect(copy).toBe(
      "Your 90-day sleep baseline is 7h/night, which puts you in the Good range. Over the past 7 completed nights, you're averaging 6h/night — about 14% below your baseline.",
    );
  });

  it("uses 'about the same as' when rounded delta is 0", () => {
    const copy = buildSleepBaselineExplainerCopy({
      day90Row: row({
        key: "day90",
        label: "90 Day",
        hasEnoughData: true,
        averageMinutes: 420,
        statusLabel: "Good",
      }),
      day7Row: row({
        key: "day7",
        label: "7 Day",
        hasEnoughData: true,
        averageMinutes: 420,
      }),
    });
    expect(copy).toBe(
      "Your 90-day sleep baseline is 7h/night, which puts you in the Good range. Over the past 7 completed nights, you're averaging 7h/night — about the same as your baseline.",
    );
  });
});
