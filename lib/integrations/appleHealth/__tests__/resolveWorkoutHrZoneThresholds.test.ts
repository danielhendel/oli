/**
 * Workout Physiology v1 — Single-source-of-truth threshold resolver tests.
 *
 * The resolver is the ONLY place hardcoded HR zone cutoffs may live in Phase B.
 * If a future change introduces personalized zones, the test surface here grows;
 * the schemas remain unchanged.
 */

import {
  DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM,
  WORKOUT_HR_ZONE_BASIS_MODEL_VERSION_V1,
  classifyHrSampleToZoneIndex,
  resolveWorkoutHrZoneThresholds,
} from "@/lib/integrations/appleHealth/resolveWorkoutHrZoneThresholds";

describe("resolveWorkoutHrZoneThresholds", () => {
  it("returns default_thresholds_v1 with the documented BPM tuple", () => {
    const r = resolveWorkoutHrZoneThresholds();
    expect(r.modelVersion).toBe(WORKOUT_HR_ZONE_BASIS_MODEL_VERSION_V1);
    expect(r.thresholdsBpm).toEqual([110, 130, 150, 170]);
    expect(r.userMaxHrBpm).toBeNull();
  });

  it("returns the same result regardless of userId in Phase B", () => {
    const a = resolveWorkoutHrZoneThresholds({ userId: "u1" });
    const b = resolveWorkoutHrZoneThresholds({ userId: "u2" });
    expect(a).toEqual(b);
  });
});

describe("classifyHrSampleToZoneIndex", () => {
  const t = DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM;

  it("classifies samples around each boundary correctly", () => {
    expect(classifyHrSampleToZoneIndex(109, t)).toBe(0); // z1
    expect(classifyHrSampleToZoneIndex(110, t)).toBe(1); // z2 (boundary inclusive lower)
    expect(classifyHrSampleToZoneIndex(129, t)).toBe(1);
    expect(classifyHrSampleToZoneIndex(130, t)).toBe(2);
    expect(classifyHrSampleToZoneIndex(149, t)).toBe(2);
    expect(classifyHrSampleToZoneIndex(150, t)).toBe(3);
    expect(classifyHrSampleToZoneIndex(169, t)).toBe(3);
    expect(classifyHrSampleToZoneIndex(170, t)).toBe(4); // z5
  });

  it("returns null for non-positive or non-finite values", () => {
    expect(classifyHrSampleToZoneIndex(0, t)).toBeNull();
    expect(classifyHrSampleToZoneIndex(-5, t)).toBeNull();
    expect(classifyHrSampleToZoneIndex(Number.NaN, t)).toBeNull();
    expect(classifyHrSampleToZoneIndex(Number.POSITIVE_INFINITY, t)).toBeNull();
  });
});
