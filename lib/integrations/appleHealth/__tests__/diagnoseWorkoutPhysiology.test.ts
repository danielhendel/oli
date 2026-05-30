/**
 * Workout Physiology v1 — Phase A diagnostic helper unit tests.
 *
 * Acceptance:
 * - Silent when `enabled: false` (default). No logger call. Returns null.
 * - Emits a structured `[AH][PHYSIOLOGY_DIAGNOSE]` payload when enabled.
 * - Counts strict + padded HR samples and exposes first/last sample timestamps.
 * - Sets `strictHrMissedButPaddedFound` only when strict==0 AND padded>0.
 * - HR probe throws → diagnostic still emits with `errors.heartRateError`.
 * - Route probe missing → `routeAvailable=false`, route error explains.
 * - `countSamplesByType` errors → cadence/power errors surface; ingest unaffected.
 * - `shouldLogAppleHealthPhysiologyDiagnostics()` honors AH_PHYSIOLOGY_DIAGNOSE env.
 */

import {
  APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL,
  DEFAULT_WORKOUT_PHYSIOLOGY_PADDING_MS,
  diagnoseWorkoutPhysiologyForWindow,
  shouldLogAppleHealthPhysiologyDiagnostics,
  type WorkoutForDiagnostic,
  type WorkoutPhysiologyDiagnostic,
  type WorkoutPhysiologyHealthKitProbe,
} from "@/lib/integrations/appleHealth/diagnoseWorkoutPhysiology";

const baseWorkout: WorkoutForDiagnostic = {
  id: "w-1",
  start: "2026-03-01T10:00:00.000Z",
  end: "2026-03-01T10:45:00.000Z",
  activityId: 37,
  activityName: "Running",
  sourceId: "watch-x",
  durationMinutes: 45,
  distanceMeters: 8000,
  calories: 420,
};

function makeProbe(over: Partial<WorkoutPhysiologyHealthKitProbe> = {}): WorkoutPhysiologyHealthKitProbe {
  return {
    queryHeartRateSamples: jest.fn(async () => ({
      ok: true as const,
      samples: [
        { value: 120, startDate: "2026-03-01T10:00:30.000Z" },
        { value: 145, startDate: "2026-03-01T10:10:00.000Z" },
        { value: 160, startDate: "2026-03-01T10:30:00.000Z" },
      ],
    })),
    queryActiveEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: 410 })),
    queryBasalEnergyKcal: jest.fn(async () => ({ ok: true as const, valueKcal: 60 })),
    countSamplesByType: jest.fn(async () => ({ ok: true as const, sampleCount: 0 })),
    ...over,
  };
}

describe("diagnoseWorkoutPhysiologyForWindow", () => {
  it("returns null and emits nothing when disabled (default)", async () => {
    const logger = jest.fn();
    const probe = makeProbe();
    const out = await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, { logger });
    expect(out).toBeNull();
    expect(logger).not.toHaveBeenCalled();
    expect(probe.queryHeartRateSamples).not.toHaveBeenCalled();
  });

  it("returns null and emits nothing when enabled is explicitly false", async () => {
    const logger = jest.fn();
    const out = await diagnoseWorkoutPhysiologyForWindow(baseWorkout, makeProbe(), {
      enabled: false,
      logger,
    });
    expect(out).toBeNull();
    expect(logger).not.toHaveBeenCalled();
  });

  it("emits a structured payload with required fields when enabled", async () => {
    const logger = jest.fn();
    const probe = makeProbe();
    const out = await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, {
      enabled: true,
      logger,
    });
    expect(out).not.toBeNull();
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledWith(
      APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL,
      expect.objectContaining({
        workoutId: "w-1",
        activityId: 37,
        activityName: "Running",
        sourceId: "watch-x",
        start: "2026-03-01T10:00:00.000Z",
        end: "2026-03-01T10:45:00.000Z",
        durationMinutes: 45,
        distanceMeters: 8000,
        calories: 420,
      }),
    );
  });

  it("queries HR twice (strict + padded ±2min by default)", async () => {
    const queryHr = jest.fn(async () => ({
      ok: true as const,
      samples: [{ value: 130, startDate: "2026-03-01T10:00:30.000Z" }],
    }));
    await diagnoseWorkoutPhysiologyForWindow(
      baseWorkout,
      makeProbe({ queryHeartRateSamples: queryHr }),
      { enabled: true, logger: () => undefined },
    );
    expect(queryHr).toHaveBeenCalledTimes(2);
    expect(queryHr).toHaveBeenNthCalledWith(1, baseWorkout.start, baseWorkout.end);
    const [padStart, padEnd] = (queryHr.mock.calls[1] ?? []) as [string, string];
    expect(Date.parse(padStart)).toBe(
      Date.parse(baseWorkout.start) - DEFAULT_WORKOUT_PHYSIOLOGY_PADDING_MS,
    );
    expect(Date.parse(padEnd)).toBe(
      Date.parse(baseWorkout.end) + DEFAULT_WORKOUT_PHYSIOLOGY_PADDING_MS,
    );
  });

  it("computes strict HR aggregates: count / first / last / avg / max", async () => {
    const logger = jest.fn();
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async (start: string) => {
        if (start === baseWorkout.start) {
          return {
            ok: true as const,
            samples: [
              { value: 100, startDate: "2026-03-01T10:01:00.000Z" },
              { value: 150, startDate: "2026-03-01T10:30:00.000Z" },
              { value: 200, startDate: "2026-03-01T10:40:00.000Z" },
            ],
          };
        }
        return { ok: true as const, samples: [] };
      }),
    });
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.strictHrSampleCount).toBe(3);
    expect(payload.strictHrFirstSampleAt).toBe("2026-03-01T10:01:00.000Z");
    expect(payload.strictHrLastSampleAt).toBe("2026-03-01T10:40:00.000Z");
    expect(payload.strictAvgHr).toBe(150);
    expect(payload.strictMaxHr).toBe(200);
    expect(payload.physiologyAvailabilityFlags.hasHeartRate).toBe(true);
    expect(payload.physiologyAvailabilityFlags.strictHrMissedButPaddedFound).toBe(false);
  });

  it("sets strictHrMissedButPaddedFound when strict=0 but padded>0", async () => {
    const logger = jest.fn();
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async (start: string) => {
        if (start === baseWorkout.start) {
          return { ok: true as const, samples: [] };
        }
        return {
          ok: true as const,
          samples: [
            { value: 120, startDate: "2026-03-01T09:59:00.000Z" },
            { value: 130, startDate: "2026-03-01T10:46:00.000Z" },
          ],
        };
      }),
    });
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.strictHrSampleCount).toBe(0);
    expect(payload.paddedHrSampleCount).toBe(2);
    expect(payload.physiologyAvailabilityFlags.strictHrMissedButPaddedFound).toBe(true);
    expect(payload.physiologyAvailabilityFlags.hasHeartRate).toBe(true);
  });

  it("never throws and surfaces heartRateError when HR query throws", async () => {
    const logger = jest.fn();
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async () => {
        throw new Error("boom");
      }),
    });
    const out = await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, {
      enabled: true,
      logger,
    });
    expect(out).not.toBeNull();
    expect(logger).toHaveBeenCalledTimes(1);
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.errors.heartRateError).toBe("boom");
    expect(payload.strictHrSampleCount).toBeNull();
    expect(payload.physiologyAvailabilityFlags.hasHeartRate).toBe(false);
  });

  it("never throws when probe returns ok:false", async () => {
    const logger = jest.fn();
    const probe = makeProbe({
      queryHeartRateSamples: jest.fn(async () => ({ ok: false as const, error: "no permission" })),
    });
    const out = await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, {
      enabled: true,
      logger,
    });
    const payload = (out as WorkoutPhysiologyDiagnostic);
    expect(payload.errors.heartRateError).toBe("no permission");
    expect(payload.strictHrSampleCount).toBeNull();
    expect(payload.paddedHrSampleCount).toBeNull();
  });

  it("marks route unavailable when probe lacks queryWorkoutRoute (Phase A default)", async () => {
    const logger = jest.fn();
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, makeProbe(), {
      enabled: true,
      logger,
    });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.routeAvailable).toBe(false);
    expect(payload.routeSampleCount).toBeNull();
    expect(payload.elevationGainMeters).toBeNull();
    expect(payload.errors.routeError).toContain("queryWorkoutRoute");
    expect(payload.physiologyAvailabilityFlags.hasRoute).toBe(false);
    expect(payload.physiologyAvailabilityFlags.hasElevation).toBe(false);
  });

  it("captures route data when probe is supplied", async () => {
    const logger = jest.fn();
    const probe = makeProbe({
      queryWorkoutRoute: jest.fn(async () => ({
        ok: true as const,
        sampleCount: 412,
        elevationGainMeters: 85.2,
      })),
    });
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.routeAvailable).toBe(true);
    expect(payload.routeSampleCount).toBe(412);
    expect(payload.elevationGainMeters).toBe(85.2);
    expect(payload.physiologyAvailabilityFlags.hasRoute).toBe(true);
    expect(payload.physiologyAvailabilityFlags.hasElevation).toBe(true);
  });

  it("reports totalEnergyKcal = active + basal when both available", async () => {
    const logger = jest.fn();
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, makeProbe(), { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.activeEnergyKcal).toBe(410);
    expect(payload.basalEnergyKcal).toBe(60);
    expect(payload.totalEnergyKcal).toBe(470);
    expect(payload.physiologyAvailabilityFlags.hasBasalEnergy).toBe(true);
  });

  it("captures energyError when both energy probes fail but emission still happens", async () => {
    const logger = jest.fn();
    const probe = makeProbe({
      queryActiveEnergyKcal: jest.fn(async () => ({ ok: false as const, error: "active denied" })),
      queryBasalEnergyKcal: jest.fn(async () => ({ ok: false as const, error: "basal denied" })),
    });
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.activeEnergyKcal).toBeNull();
    expect(payload.basalEnergyKcal).toBeNull();
    expect(payload.totalEnergyKcal).toBeNull();
    expect(payload.errors.energyError).toBe("active denied");
    expect(payload.physiologyAvailabilityFlags.hasBasalEnergy).toBe(false);
  });

  it("attempts cadence + power + speed identifiers via countSamplesByType", async () => {
    const count = jest.fn(async () => ({ ok: true as const, sampleCount: 3 }));
    const logger = jest.fn();
    await diagnoseWorkoutPhysiologyForWindow(
      baseWorkout,
      makeProbe({ countSamplesByType: count }),
      { enabled: true, logger },
    );
    const types = count.mock.calls.map((c) => c[0]);
    expect(types).toEqual(
      expect.arrayContaining([
        "CyclingCadence",
        "RunningStrideLength",
        "CyclingPower",
        "RunningPower",
        "RunningSpeed",
        "CyclingSpeed",
      ]),
    );
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.cadenceSampleCount).toBe(6);
    expect(payload.powerSampleCount).toBe(6);
    expect(payload.speedSampleCount).toBe(6);
    expect(payload.physiologyAvailabilityFlags.hasCadence).toBe(true);
    expect(payload.physiologyAvailabilityFlags.hasPower).toBe(true);
    expect(payload.physiologyAvailabilityFlags.hasSpeed).toBe(true);
  });

  it("surfaces cadenceError when countSamplesByType is missing on bridge", async () => {
    const logger = jest.fn();
    const probe: WorkoutPhysiologyHealthKitProbe = {
      queryHeartRateSamples: jest.fn(async () => ({ ok: true as const, samples: [] })),
    };
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, probe, { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.cadenceSampleCount).toBeNull();
    expect(payload.powerSampleCount).toBeNull();
    expect(payload.speedSampleCount).toBeNull();
    expect(payload.errors.cadenceError).toContain("countSamplesByType");
    expect(payload.errors.powerError).toContain("countSamplesByType");
  });

  it("surfaces cadenceError when a single identifier query throws", async () => {
    const logger = jest.fn();
    const count = jest.fn(async (type: string) => {
      if (type === "CyclingCadence") {
        throw new Error("cad-blew-up");
      }
      return { ok: true as const, sampleCount: 0 };
    });
    await diagnoseWorkoutPhysiologyForWindow(
      baseWorkout,
      makeProbe({ countSamplesByType: count }),
      { enabled: true, logger },
    );
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.errors.cadenceError).toBe("cad-blew-up");
    // The other identifiers still resolved; non-cadence counts stay at zero.
    expect(payload.cadenceSampleCount).toBe(0);
  });

  it("HKWorkoutEvents are always null in Phase A (bridge does not expose them)", async () => {
    const logger = jest.fn();
    await diagnoseWorkoutPhysiologyForWindow(baseWorkout, makeProbe(), { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.workoutEventsCount).toBeNull();
    expect(payload.workoutEventTypes).toBeNull();
    expect(payload.physiologyAvailabilityFlags.hasWorkoutEvents).toBe(false);
  });

  it("does not mutate the input workout", async () => {
    const logger = jest.fn();
    const original = { ...baseWorkout };
    await diagnoseWorkoutPhysiologyForWindow(original, makeProbe(), { enabled: true, logger });
    expect(original).toEqual(baseWorkout);
  });

  it("respects custom padding override", async () => {
    const queryHr = jest.fn(async () => ({ ok: true as const, samples: [] }));
    await diagnoseWorkoutPhysiologyForWindow(
      baseWorkout,
      makeProbe({ queryHeartRateSamples: queryHr }),
      { enabled: true, logger: () => undefined, paddingMs: 60_000 },
    );
    const [padStart, padEnd] = (queryHr.mock.calls[1] ?? []) as [string, string];
    expect(Date.parse(padStart)).toBe(Date.parse(baseWorkout.start) - 60_000);
    expect(Date.parse(padEnd)).toBe(Date.parse(baseWorkout.end) + 60_000);
  });

  it("synthesises an id when the workout has no id", async () => {
    const logger = jest.fn();
    const w: WorkoutForDiagnostic = {
      start: "2026-04-01T08:00:00.000Z",
      end: "2026-04-01T09:00:00.000Z",
      activityId: 13,
      activityName: "Strength",
      sourceId: null,
      durationMinutes: 60,
    };
    await diagnoseWorkoutPhysiologyForWindow(w, makeProbe(), { enabled: true, logger });
    const payload = logger.mock.calls[0]![1] as WorkoutPhysiologyDiagnostic;
    expect(payload.workoutId).toBe("2026-04-01T08:00:00.000Z_2026-04-01T09:00:00.000Z_13");
  });

  it("emits via console.log when no logger override is provided", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      await diagnoseWorkoutPhysiologyForWindow(baseWorkout, makeProbe(), { enabled: true });
      expect(spy).toHaveBeenCalledWith(
        APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL,
        expect.objectContaining({ workoutId: "w-1" }),
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe("shouldLogAppleHealthPhysiologyDiagnostics", () => {
  const originalOverride = process.env.AH_PHYSIOLOGY_DIAGNOSE;

  afterEach(() => {
    if (originalOverride === undefined) {
      delete process.env.AH_PHYSIOLOGY_DIAGNOSE;
    } else {
      process.env.AH_PHYSIOLOGY_DIAGNOSE = originalOverride;
    }
  });

  it("returns false by default inside Jest (JEST_WORKER_ID is set)", () => {
    delete process.env.AH_PHYSIOLOGY_DIAGNOSE;
    expect(process.env.JEST_WORKER_ID).toBeDefined();
    expect(shouldLogAppleHealthPhysiologyDiagnostics()).toBe(false);
  });

  it("returns true when AH_PHYSIOLOGY_DIAGNOSE is '1'", () => {
    process.env.AH_PHYSIOLOGY_DIAGNOSE = "1";
    expect(shouldLogAppleHealthPhysiologyDiagnostics()).toBe(true);
  });

  it("returns false when AH_PHYSIOLOGY_DIAGNOSE is '0' (explicit disable wins)", () => {
    process.env.AH_PHYSIOLOGY_DIAGNOSE = "0";
    expect(shouldLogAppleHealthPhysiologyDiagnostics()).toBe(false);
  });
});
