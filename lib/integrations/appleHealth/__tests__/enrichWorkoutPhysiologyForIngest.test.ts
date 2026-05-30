/**
 * Workout Physiology v1 — Phase B enrichment helper unit tests.
 *
 * Acceptance:
 * - Disabled (flag off) → returns null, no probe calls.
 * - Strict HR missed but padded found → avg/max produced via padded ±60s window.
 * - Neighbor clipping (`priorEndIso` / `nextStartIso`) trims the padded window.
 * - Zone tuple sums to ~durationMinutes when samples span the strict window.
 * - Zone basis stamps `default_thresholds_v1` + the resolver's thresholds.
 * - Active + basal energy summed to totalEnergyKcal.
 * - Post-workout HR recovery queries [end, end+120s] and produces dropBpm.
 * - Bridge errors → fields silently omitted; never throws.
 * - Block omitted entirely when no probe returned usable data.
 * - physiologyVersion stamped when any field present.
 */

import {
  enrichWorkoutPhysiologyForIngest,
  shouldEnableWorkoutPhysiologyV1,
  WORKOUT_PHYSIOLOGY_POST_HR_WINDOW_SECONDS,
  WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS,
  computeHeartRateZoneMinutes,
} from "@/lib/integrations/appleHealth/enrichWorkoutPhysiologyForIngest";
import type {
  WorkoutForDiagnostic,
  WorkoutPhysiologyHealthKitProbe,
  WorkoutPhysiologyHrSample,
} from "@/lib/integrations/appleHealth/diagnoseWorkoutPhysiology";
import { DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM } from "@/lib/integrations/appleHealth/resolveWorkoutHrZoneThresholds";

const baseWorkout: WorkoutForDiagnostic = {
  id: "w-1",
  start: "2026-03-01T10:00:00.000Z",
  end: "2026-03-01T10:30:00.000Z",
  activityId: 37,
  activityName: "Running",
  sourceId: "watch-x",
  durationMinutes: 30,
};

function makeProbe(
  over: Partial<WorkoutPhysiologyHealthKitProbe> = {},
): WorkoutPhysiologyHealthKitProbe {
  return {
    queryHeartRateSamples: jest.fn(async () => ({ ok: true as const, samples: [] })),
    queryActiveEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: null })),
    queryBasalEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: null })),
    ...over,
  };
}

describe("shouldEnableWorkoutPhysiologyV1", () => {
  const prev = process.env.AH_WORKOUT_PHYSIOLOGY_V1;
  afterEach(() => {
    if (prev === undefined) delete process.env.AH_WORKOUT_PHYSIOLOGY_V1;
    else process.env.AH_WORKOUT_PHYSIOLOGY_V1 = prev;
  });

  it("defaults to enabled", () => {
    delete process.env.AH_WORKOUT_PHYSIOLOGY_V1;
    expect(shouldEnableWorkoutPhysiologyV1()).toBe(true);
  });
  it("respects AH_WORKOUT_PHYSIOLOGY_V1=0 kill switch", () => {
    process.env.AH_WORKOUT_PHYSIOLOGY_V1 = "0";
    expect(shouldEnableWorkoutPhysiologyV1()).toBe(false);
  });
  it("respects AH_WORKOUT_PHYSIOLOGY_V1=1 (still enabled)", () => {
    process.env.AH_WORKOUT_PHYSIOLOGY_V1 = "1";
    expect(shouldEnableWorkoutPhysiologyV1()).toBe(true);
  });
});

describe("enrichWorkoutPhysiologyForIngest — gating", () => {
  it("returns null when enabled=false; no probe calls", async () => {
    const probe = makeProbe();
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: false });
    expect(out).toBeNull();
    expect(probe.queryHeartRateSamples).not.toHaveBeenCalled();
    expect(probe.queryActiveEnergyKcal).not.toHaveBeenCalled();
    expect(probe.queryBasalEnergyKcal).not.toHaveBeenCalled();
  });

  it("returns null when no probe returned usable data", async () => {
    const probe = makeProbe();
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out).toBeNull();
  });
});

describe("enrichWorkoutPhysiologyForIngest — padded HR", () => {
  it("recovers strictHrMissedButPaddedFound via ±60s padded window", async () => {
    let firstPaddedRange: { start: string; end: string } | null = null;
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async (start: string, end: string) => {
        if (firstPaddedRange == null) firstPaddedRange = { start, end };
        return {
          ok: true as const,
          samples: [
            { value: 130, startDate: "2026-03-01T10:00:30.000Z" },
            { value: 150, startDate: "2026-03-01T10:15:00.000Z" },
            { value: 170, startDate: "2026-03-01T10:29:30.000Z" },
          ],
        };
      }),
    });
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out).not.toBeNull();
    expect(out!.averageHeartRateBpm).toBeGreaterThanOrEqual(140);
    expect(out!.averageHeartRateBpm).toBeLessThanOrEqual(160);
    expect(out!.maxHeartRateBpm).toBe(170);
    expect(out!.physiologyVersion).toBe(1);
    expect(firstPaddedRange).not.toBeNull();
    expect(Date.parse(firstPaddedRange!.start)).toBe(
      Date.parse(baseWorkout.start) - WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS,
    );
    expect(Date.parse(firstPaddedRange!.end)).toBe(
      Date.parse(baseWorkout.end) + WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS,
    );
  });

  it("clips padded HR window to neighbor priorEndIso / nextStartIso", async () => {
    const captured: { start: string; end: string }[] = [];
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async (start: string, end: string) => {
        captured.push({ start, end });
        return { ok: true as const, samples: [] };
      }),
    });
    await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, {
      enabled: true,
      neighbors: {
        priorEndIso: "2026-03-01T09:59:30.000Z", // 30 s before start → clip leading padding
        nextStartIso: "2026-03-01T10:30:30.000Z", // 30 s after end → clip trailing padding + recovery
      },
    });
    // First call is the padded summary HR window; subsequent (if any) is recovery.
    expect(captured.length).toBeGreaterThanOrEqual(1);
    expect(captured[0]!.start).toBe("2026-03-01T09:59:30.000Z");
    expect(captured[0]!.end).toBe("2026-03-01T10:30:30.000Z");
  });
});

describe("enrichWorkoutPhysiologyForIngest — zones", () => {
  it("produces a 5-tuple summing to ~durationMinutes using default thresholds", async () => {
    // 30 evenly spaced samples across the strict window.
    const samples: WorkoutPhysiologyHrSample[] = [];
    const stride = (30 * 60_000) / 30; // 1-minute stride
    const startMs = Date.parse(baseWorkout.start);
    for (let i = 0; i < 30; i++) {
      samples.push({
        value: 145, // squarely in z3 (130..149)
        startDate: new Date(startMs + i * stride).toISOString(),
      });
    }
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async () => ({ ok: true as const, samples })),
    });
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out).not.toBeNull();
    expect(out!.heartRateZoneMinutes).toBeDefined();
    expect(out!.heartRateZoneBasis).toEqual({
      modelVersion: "default_thresholds_v1",
      thresholdsBpm: [...DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM],
      userMaxHrBpm: null,
      computedFromSampleCount: 30,
    });
    const zones = out!.heartRateZoneMinutes!;
    const total = zones.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(29);
    expect(total).toBeLessThan(31);
    expect(zones[2]).toBeGreaterThan(29); // all in z3
  });
});

describe("enrichWorkoutPhysiologyForIngest — energy", () => {
  it("sums active + basal into totalEnergyKcal", async () => {
    const probe = makeProbe({
      queryActiveEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: 380 })),
      queryBasalEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: 35 })),
    });
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out).not.toBeNull();
    expect(out!.activeEnergyKcal).toBe(380);
    expect(out!.basalEnergyKcal).toBe(35);
    expect(out!.totalEnergyKcal).toBe(415);
  });

  it("falls back to active-only when basal absent", async () => {
    const probe = makeProbe({
      queryActiveEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: 420 })),
      queryBasalEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: null })),
    });
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out!.activeEnergyKcal).toBe(420);
    expect(out!.basalEnergyKcal).toBeUndefined();
    expect(out!.totalEnergyKcal).toBe(420);
  });
});

describe("enrichWorkoutPhysiologyForIngest — post-workout HR recovery", () => {
  it("queries [end, end+120s] and produces dropBpm", async () => {
    const captured: { start: string; end: string }[] = [];
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async (start: string, end: string) => {
        captured.push({ start, end });
        if (start === baseWorkout.end) {
          // recovery window
          return {
            ok: true as const,
            samples: [
              { value: 150, startDate: "2026-03-01T10:30:05.000Z" },
              { value: 110, startDate: "2026-03-01T10:31:55.000Z" },
            ],
          };
        }
        return { ok: true as const, samples: [] };
      }),
    });
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out).not.toBeNull();
    expect(out!.postWorkoutHeartRate).toBeDefined();
    expect(out!.postWorkoutHeartRate!.windowSeconds).toBe(WORKOUT_PHYSIOLOGY_POST_HR_WINDOW_SECONDS);
    expect(out!.postWorkoutHeartRate!.startBpm).toBe(150);
    expect(out!.postWorkoutHeartRate!.endBpm).toBe(110);
    expect(out!.postWorkoutHeartRate!.dropBpm).toBe(40);
    expect(out!.postWorkoutHeartRate!.sampleCount).toBe(2);
  });

  it("clips recovery window when nextStartIso comes before end+120s", async () => {
    const captured: { start: string; end: string }[] = [];
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async (start: string, end: string) => {
        captured.push({ start, end });
        return { ok: true as const, samples: [] };
      }),
    });
    await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, {
      enabled: true,
      neighbors: {
        priorEndIso: null,
        nextStartIso: "2026-03-01T10:30:30.000Z", // 30 s after end
      },
    });
    // Find the recovery call (the one whose start === workout.end).
    const recoveryCall = captured.find((c) => c.start === baseWorkout.end);
    expect(recoveryCall).toBeDefined();
    expect(recoveryCall!.end).toBe("2026-03-01T10:30:30.000Z");
  });
});

describe("enrichWorkoutPhysiologyForIngest — resilience", () => {
  it("never throws when probe methods reject", async () => {
    const probe: WorkoutPhysiologyHealthKitProbe = {
      queryHeartRateSamples: jest.fn(async () => {
        throw new Error("bridge boom");
      }),
      queryActiveEnergyKcal: jest.fn(async () => {
        throw new Error("bridge boom");
      }),
      queryBasalEnergyKcal: jest.fn(async () => {
        throw new Error("bridge boom");
      }),
    };
    await expect(
      enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true }),
    ).resolves.toBeNull();
  });

  it("omits HR fields when probe returns ok:false; energy still flows", async () => {
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async () => ({ ok: false as const, error: "no permission" })),
      queryActiveEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: 220 })),
    });
    const out = await enrichWorkoutPhysiologyForIngest(baseWorkout, probe, { enabled: true });
    expect(out).not.toBeNull();
    expect(out!.averageHeartRateBpm).toBeUndefined();
    expect(out!.maxHeartRateBpm).toBeUndefined();
    expect(out!.activeEnergyKcal).toBe(220);
  });
});

describe("computeHeartRateZoneMinutes", () => {
  const startMs = Date.parse("2026-03-01T10:00:00.000Z");
  const endMs = Date.parse("2026-03-01T10:30:00.000Z");

  it("returns null on empty samples", () => {
    expect(computeHeartRateZoneMinutes([], startMs, endMs, DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM)).toBeNull();
  });

  it("clips samples outside strict window to zero dwell", () => {
    const samples: WorkoutPhysiologyHrSample[] = [
      { value: 100, startDate: "2026-03-01T09:50:00.000Z" }, // before start
      { value: 150, startDate: "2026-03-01T11:00:00.000Z" }, // after end
    ];
    const r = computeHeartRateZoneMinutes(samples, startMs, endMs, DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
    expect(r).toBeNull();
  });

  it("distributes dwell time across zones correctly", () => {
    const samples: WorkoutPhysiologyHrSample[] = [
      { value: 100, startDate: "2026-03-01T10:00:00.000Z" }, // z1 for 10 min
      { value: 140, startDate: "2026-03-01T10:10:00.000Z" }, // z3 for 10 min
      { value: 175, startDate: "2026-03-01T10:20:00.000Z" }, // z5 for 10 min
    ];
    const r = computeHeartRateZoneMinutes(samples, startMs, endMs, DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM);
    expect(r).not.toBeNull();
    expect(r!.zoneMinutes).toEqual([10, 0, 10, 0, 10]);
    expect(r!.usedSampleCount).toBe(3);
  });
});
