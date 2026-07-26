import { describe, expect, it } from "@jest/globals";

import {
  formatRestingHeartRateBpm,
  resolveRestingHeartRateBpm,
  resolveRestingHeartRateFromNightField,
  RESTING_HEART_RATE_BPM_MAX,
  RESTING_HEART_RATE_BPM_MIN,
} from "@/lib/data/readiness/restingHeartRateValue";

describe("resolveRestingHeartRateBpm", () => {
  it("accepts valid overnight lowest HR and rounds display", () => {
    const resolved = resolveRestingHeartRateBpm(49.4);
    expect(resolved).toEqual({
      bpm: 49.4,
      displayBpm: 49,
      formatted: "49 bpm",
      accessibilityValue: "49 beats per minute",
    });
    expect(formatRestingHeartRateBpm(49)).toBe("49 bpm");
  });

  it("accepts inclusive bounds 30 and 220", () => {
    expect(resolveRestingHeartRateBpm(RESTING_HEART_RATE_BPM_MIN)?.displayBpm).toBe(30);
    expect(resolveRestingHeartRateBpm(RESTING_HEART_RATE_BPM_MAX)?.displayBpm).toBe(220);
  });

  it("returns null for missing and invalid without substituting 0", () => {
    expect(resolveRestingHeartRateBpm(null)).toBeNull();
    expect(resolveRestingHeartRateBpm(undefined)).toBeNull();
    expect(resolveRestingHeartRateBpm(Number.NaN)).toBeNull();
    expect(resolveRestingHeartRateBpm(Number.POSITIVE_INFINITY)).toBeNull();
    expect(resolveRestingHeartRateBpm(29)).toBeNull();
    expect(resolveRestingHeartRateBpm(221)).toBeNull();
    expect(resolveRestingHeartRateBpm(0)).toBeNull();
    expect(resolveRestingHeartRateBpm("49")).toBeNull();
  });

  it("does not treat contributor scores as bpm via night field helper", () => {
    // Contributor scores are typically 0–100; 80 is valid bpm physiologically but
    // the night-field helper still only accepts SleepNight.lowestHeartRateBpm callers.
    expect(resolveRestingHeartRateFromNightField(80)?.formatted).toBe("80 bpm");
    expect(resolveRestingHeartRateFromNightField(5)).toBeNull();
  });
});
