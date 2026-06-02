import {
  HEART_RATE_ZONE_LABELS,
  decodeHeartRateZoneMinutesFromRoute,
  encodeHeartRateZoneMinutesForRoute,
  formatZoneDurationMinSec,
  formatZoneRangeBpm,
  resolveZoneDisplayThresholdsBpm,
  sumHeartRateZoneMinutes,
  validateHeartRateZoneMinutesTuple,
  type HeartRateZoneMinutesTuple,
} from "@/lib/data/workouts/heartRateZonePresentation";
import { DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM } from "@/lib/integrations/appleHealth/resolveWorkoutHrZoneThresholds";

describe("HEART_RATE_ZONE_LABELS", () => {
  it("exposes the canonical Zone 1..5 labels in order", () => {
    expect(HEART_RATE_ZONE_LABELS).toEqual(["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"]);
  });
});

describe("formatZoneDurationMinSec", () => {
  it("renders Apple-Fitness mm:ss with second rounding", () => {
    // 32.816 min × 60 = 1968.96 s → 1969 s → 32:49 (matches Apple screenshot).
    expect(formatZoneDurationMinSec(32.816)).toBe("32:49");
    // 1.183 × 60 = 70.98 s → 71 s → 1:11.
    expect(formatZoneDurationMinSec(1.183)).toBe("1:11");
  });
  it("zero is meaningful (0:00), not '—'", () => {
    expect(formatZoneDurationMinSec(0)).toBe("0:00");
  });
  it("returns null for missing / negative / non-finite", () => {
    expect(formatZoneDurationMinSec(null)).toBeNull();
    expect(formatZoneDurationMinSec(undefined)).toBeNull();
    expect(formatZoneDurationMinSec(Number.NaN)).toBeNull();
    expect(formatZoneDurationMinSec(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatZoneDurationMinSec(-1)).toBeNull();
  });
  it("rounds sub-second remainders correctly", () => {
    expect(formatZoneDurationMinSec(0.5)).toBe("0:30");
    expect(formatZoneDurationMinSec(0.0083)).toBe("0:00"); // 0.5s rounds down by Math.round
    expect(formatZoneDurationMinSec(0.0084)).toBe("0:01"); // 0.504s rounds up
  });
});

describe("formatZoneRangeBpm — default_thresholds_v1 (110/130/150/170)", () => {
  const t = DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM;
  it("zone 1 (z1) renders '<{t1} bpm'", () => {
    expect(formatZoneRangeBpm(0, t)).toBe("<110 bpm");
  });
  it("zones 2..4 render '{tn}–{tn+1 - 1} bpm' with en-dash", () => {
    expect(formatZoneRangeBpm(1, t)).toBe("110\u2013129 bpm");
    expect(formatZoneRangeBpm(2, t)).toBe("130\u2013149 bpm");
    expect(formatZoneRangeBpm(3, t)).toBe("150\u2013169 bpm");
  });
  it("zone 5 (z5) renders '{t4}+ bpm'", () => {
    expect(formatZoneRangeBpm(4, t)).toBe("170+ bpm");
  });
});

describe("resolveZoneDisplayThresholdsBpm", () => {
  it("falls back to DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM when basis is null/undefined", () => {
    expect(resolveZoneDisplayThresholdsBpm(null)).toEqual(DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
    expect(resolveZoneDisplayThresholdsBpm(undefined)).toEqual(DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
  });
  it("falls back when basis.thresholdsBpm is malformed", () => {
    expect(resolveZoneDisplayThresholdsBpm({})).toEqual(DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
    expect(
      resolveZoneDisplayThresholdsBpm({ thresholdsBpm: [110, 130, 150] as unknown as [number, number, number, number] }),
    ).toEqual(DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
    expect(
      resolveZoneDisplayThresholdsBpm({
        thresholdsBpm: [Number.NaN, 130, 150, 170] as readonly [number, number, number, number],
      }),
    ).toEqual(DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
  });
  it("forwards a valid basis (forward-compat with future personalized models)", () => {
    const personalized = [127, 140, 151, 163] as const;
    expect(resolveZoneDisplayThresholdsBpm({ thresholdsBpm: personalized })).toEqual(personalized);
  });
});

describe("validateHeartRateZoneMinutesTuple", () => {
  it("returns the tuple when valid", () => {
    const t = [1, 2, 3, 4, 5] as const;
    expect(validateHeartRateZoneMinutesTuple(t)).toEqual(t);
  });
  it("rejects wrong length", () => {
    expect(validateHeartRateZoneMinutesTuple([1, 2, 3, 4])).toBeNull();
    expect(validateHeartRateZoneMinutesTuple([1, 2, 3, 4, 5, 6])).toBeNull();
  });
  it("rejects non-finite / negative / non-number entries", () => {
    expect(validateHeartRateZoneMinutesTuple([1, 2, 3, 4, Number.NaN])).toBeNull();
    expect(validateHeartRateZoneMinutesTuple([1, 2, 3, 4, -0.1])).toBeNull();
    expect(validateHeartRateZoneMinutesTuple([1, 2, "3" as unknown as number, 4, 5])).toBeNull();
  });
  it("accepts zero values (zero is meaningful)", () => {
    expect(validateHeartRateZoneMinutesTuple([0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0]);
  });
  it("rejects null/undefined/non-array inputs", () => {
    expect(validateHeartRateZoneMinutesTuple(null)).toBeNull();
    expect(validateHeartRateZoneMinutesTuple(undefined)).toBeNull();
    expect(validateHeartRateZoneMinutesTuple({} as unknown)).toBeNull();
  });
});

describe("encode/decodeHeartRateZoneMinutesForRoute (round-trip)", () => {
  it("round-trips the exact bug tuple", () => {
    const tuple = [32.816, 1.183, 0, 0, 0] as const;
    const encoded = encodeHeartRateZoneMinutesForRoute(tuple);
    expect(encoded).toBe("32.816,1.183,0,0,0");
    const decoded = decodeHeartRateZoneMinutesFromRoute(encoded!);
    expect(decoded).toEqual(tuple);
  });
  it("trims trailing zeros for clean URLs but preserves precision", () => {
    const encoded = encodeHeartRateZoneMinutesForRoute([1.5, 2, 3.25, 0, 0] as const);
    expect(encoded).toBe("1.5,2,3.25,0,0");
  });
  it("returns null when tuple is malformed", () => {
    expect(encodeHeartRateZoneMinutesForRoute(null)).toBeNull();
    expect(encodeHeartRateZoneMinutesForRoute(undefined)).toBeNull();
    expect(
      encodeHeartRateZoneMinutesForRoute([1, 2, 3, 4] as unknown as HeartRateZoneMinutesTuple),
    ).toBeNull();
  });
  it("decodes from a string array (Expo Router array-valued param)", () => {
    const decoded = decodeHeartRateZoneMinutesFromRoute(["10,20,5,2,0.5"]);
    expect(decoded).toEqual([10, 20, 5, 2, 0.5]);
  });
  it("returns null for malformed encoded strings", () => {
    expect(decodeHeartRateZoneMinutesFromRoute("not,a,valid,tuple")).toBeNull();
    expect(decodeHeartRateZoneMinutesFromRoute("1,2,3")).toBeNull();
    expect(decodeHeartRateZoneMinutesFromRoute("1,2,3,4,-1")).toBeNull();
    expect(decodeHeartRateZoneMinutesFromRoute(undefined)).toBeNull();
    expect(decodeHeartRateZoneMinutesFromRoute("")).toBeNull();
  });
});

describe("sumHeartRateZoneMinutes", () => {
  it("sums all five entries", () => {
    expect(sumHeartRateZoneMinutes([1.5, 2.25, 3, 0, 0.25])).toBeCloseTo(7);
  });
  it("returns 0 for an all-zero tuple", () => {
    expect(sumHeartRateZoneMinutes([0, 0, 0, 0, 0])).toBe(0);
  });
});
