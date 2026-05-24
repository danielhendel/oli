/**
 * Locks the bridge-shape behavior for {@link sumStepSamplesFromNativeBridgeResult},
 * the pure aggregator used by {@link getStepCountForDateRange}.
 *
 * Background: react-native-health@1.19 `fitness_getSamples` serializes each
 * `HKQuantitySample` with key `"quantity"` (for `HKUnit countUnit`), not `"value"`.
 * Prior to this fix, production read `sample.value` and silently summed 0 for every
 * workout — see P0 audit notes in `lib/integrations/appleHealth/healthKit.ts`.
 */
import { sumStepSamplesFromNativeBridgeResult } from "../healthKit";

describe("sumStepSamplesFromNativeBridgeResult", () => {
  it("native bridge shape: sums `quantity` keys from getSamples result", () => {
    const result = sumStepSamplesFromNativeBridgeResult([
      { quantity: 50, start: "2026-05-24T10:44:42.262-0400", end: "2026-05-24T10:50:00.000-0400" },
      { quantity: 12, start: "2026-05-24T10:50:00.000-0400", end: "2026-05-24T10:55:00.000-0400" },
    ]);
    expect(result).toBe(62);
  });

  it("backward compatibility: sums legacy `value` keys when bridge returns that shape", () => {
    const result = sumStepSamplesFromNativeBridgeResult([{ value: 30 }, { value: 10 }]);
    expect(result).toBe(40);
  });

  it("mixed shape: sums `quantity` and `value` keys across different samples", () => {
    const result = sumStepSamplesFromNativeBridgeResult([{ quantity: 50 }, { value: 12 }]);
    expect(result).toBe(62);
  });

  it("prefers `quantity` over `value` when both are present on the same sample", () => {
    const result = sumStepSamplesFromNativeBridgeResult([
      { quantity: 50, value: 999 },
    ]);
    expect(result).toBe(50);
  });

  it("returns null for an empty array (`no reliable workout-window step data`)", () => {
    expect(sumStepSamplesFromNativeBridgeResult([])).toBeNull();
  });

  it("returns null for non-array input (null / undefined / object / number / string)", () => {
    expect(sumStepSamplesFromNativeBridgeResult(null)).toBeNull();
    expect(sumStepSamplesFromNativeBridgeResult(undefined)).toBeNull();
    expect(sumStepSamplesFromNativeBridgeResult({})).toBeNull();
    expect(sumStepSamplesFromNativeBridgeResult(42)).toBeNull();
    expect(sumStepSamplesFromNativeBridgeResult("[]")).toBeNull();
  });

  it("returns null when no sample carries a valid finite non-negative numeric quantity/value", () => {
    const result = sumStepSamplesFromNativeBridgeResult([
      { quantity: "50" }, // string — invalid
      { quantity: Number.NaN },
      { value: -1 },
      { value: Number.POSITIVE_INFINITY },
      { other: 7 }, // unrelated key
      null,
      "not an object",
    ]);
    expect(result).toBeNull();
  });

  it("returns 0 when at least one sample has a real numeric zero", () => {
    expect(sumStepSamplesFromNativeBridgeResult([{ quantity: 0 }])).toBe(0);
    expect(sumStepSamplesFromNativeBridgeResult([{ value: 0 }])).toBe(0);
    expect(
      sumStepSamplesFromNativeBridgeResult([{ quantity: 0 }, { quantity: 0 }]),
    ).toBe(0);
  });

  it("rounds the final sum to an integer (HK can return fractional aggregations)", () => {
    const result = sumStepSamplesFromNativeBridgeResult([
      { quantity: 49.4 },
      { quantity: 12.4 },
    ]);
    expect(result).toBe(62);
  });

  it("ignores invalid samples but still counts valid ones (mixed validity)", () => {
    const result = sumStepSamplesFromNativeBridgeResult([
      { quantity: 25 },
      { quantity: Number.NaN },
      { value: -3 },
      { value: 15 },
      { other: 99 },
    ]);
    expect(result).toBe(40);
  });
});
