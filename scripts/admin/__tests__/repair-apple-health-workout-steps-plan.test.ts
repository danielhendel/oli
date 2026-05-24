/**
 * Unit tests for the pure planning helpers used by
 * scripts/admin/repair-apple-health-workout-steps.mjs.
 *
 * These exercise:
 * - JSON shape validation (validateMeasurementsFile)
 * - Per-workout repair decisioning (planRepairForWorkout)
 * - DailyFacts partition invariant (verifyAllocationPartition)
 *
 * No Firestore / network / firebase-admin imports here.
 */

type PlanResult =
  | {
      action: "patch";
      correctedStepsValue: number;
      previousRawSteps: number | null;
      previousCanonicalSteps: number | null;
      rawPayloadPatch: Record<string, unknown>;
      canonicalPatch: Record<string, unknown>;
      auditMarker: Record<string, unknown>;
    }
  | { action: "skip"; reason: string; details?: Record<string, unknown> }
  | { action: "error"; error: string };

interface PlanModule {
  REPAIR_AUDIT_KEY: string;
  REPAIR_VERSION: number;
  REPAIR_SOURCE: string;
  validateMeasurementsFile: (
    input: unknown,
    expectedUid: string,
    expectedDay: string,
  ) =>
    | { ok: true; measurements: { rawEventId: string; steps: number | null }[] }
    | { ok: false; error: string };
  validateBatchMeasurementsFile: (
    input: unknown,
    expectedUid: string,
  ) =>
    | {
        ok: true;
        uid: string;
        generatedAt: string | null;
        days: {
          day: string;
          measurements: { rawEventId: string; steps: number | null }[];
        }[];
      }
    | { ok: false; error: string };
  planRepairForWorkout: (params: {
    rawEventId: string;
    measuredSteps: number | null;
    rawDoc: Record<string, unknown> | null | undefined;
    canonicalDoc: Record<string, unknown> | null | undefined;
    appliedAt: string;
  }) => PlanResult;
  verifyAllocationPartition: (input: {
    steps: number;
    allocation: { neatSteps: number; strengthSteps: number; cardioSteps: number };
  }) => { ok: true } | { ok: false; error: string };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plan: PlanModule = require("../lib/repair-apple-health-workout-steps-plan.cjs");

const UID = "user_under_test";
const DAY = "2026-05-24";
const NOW = "2026-05-24T18:00:00.000Z";

const RAW_ID =
  "appleHealth:v2:workout:2026-05-24T11:48:37.616-0400_2026-05-24T12:18:51.361-0400_37_com.apple.health.X";

function buildRawWorkout(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const payloadOverride = (overrides["payload"] as Record<string, unknown> | undefined) ?? {};
  const { payload: _ignored, ...restOverrides } = overrides;
  void _ignored;
  return {
    id: RAW_ID,
    userId: UID,
    provider: "apple_health",
    sourceId: "apple_health",
    kind: "workout",
    observedAt: "2026-05-24T15:48:37.616Z",
    receivedAt: "2026-05-24T16:00:00.000Z",
    timeZone: "America/New_York",
    ...restOverrides,
    payload: {
      start: "2026-05-24T11:48:37.616-0400",
      end: "2026-05-24T12:18:51.361-0400",
      timezone: "America/New_York",
      sport: "running",
      durationMinutes: 30,
      steps: 0,
      distanceMeters: 4400,
      ...payloadOverride,
    },
  };
}

function buildCanonicalWorkout(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: RAW_ID,
    userId: UID,
    sourceId: "apple_health",
    kind: "workout",
    start: "2026-05-24T11:48:37.616-0400",
    end: "2026-05-24T12:18:51.361-0400",
    day: "2026-05-24",
    timezone: "America/New_York",
    sport: "running",
    durationMinutes: 30,
    steps: 0,
    createdAt: "2026-05-24T16:00:00.000Z",
    updatedAt: "2026-05-24T16:00:00.000Z",
    schemaVersion: 1,
    ...overrides,
  };
}

describe("validateMeasurementsFile", () => {
  it("accepts a valid file with positive and null entries", () => {
    const r = plan.validateMeasurementsFile(
      {
        uid: UID,
        day: DAY,
        measurements: [
          { rawEventId: "a", steps: 1843 },
          { rawEventId: "b", steps: null },
          { rawEventId: "c", steps: 0 },
        ],
      },
      UID,
      DAY,
    );
    expect(r).toEqual({
      ok: true,
      measurements: [
        { rawEventId: "a", steps: 1843 },
        { rawEventId: "b", steps: null },
        { rawEventId: "c", steps: 0 },
      ],
    });
  });

  it("rejects uid mismatch", () => {
    const r = plan.validateMeasurementsFile(
      { uid: "other", day: DAY, measurements: [{ rawEventId: "a", steps: 1 }] },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects day mismatch", () => {
    const r = plan.validateMeasurementsFile(
      {
        uid: UID,
        day: "2026-05-23",
        measurements: [{ rawEventId: "a", steps: 1 }],
      },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects invalid day format", () => {
    const r = plan.validateMeasurementsFile(
      { uid: UID, day: "5/24/2026", measurements: [{ rawEventId: "a", steps: 1 }] },
      UID,
      "5/24/2026",
    );
    expect(r.ok).toBe(false);
  });

  it("rejects empty measurements array", () => {
    const r = plan.validateMeasurementsFile(
      { uid: UID, day: DAY, measurements: [] },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects non-object top level", () => {
    expect(plan.validateMeasurementsFile([], UID, DAY).ok).toBe(false);
    expect(plan.validateMeasurementsFile(null, UID, DAY).ok).toBe(false);
    expect(plan.validateMeasurementsFile("foo", UID, DAY).ok).toBe(false);
  });

  it("rejects negative steps", () => {
    const r = plan.validateMeasurementsFile(
      { uid: UID, day: DAY, measurements: [{ rawEventId: "a", steps: -1 }] },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects NaN steps", () => {
    const r = plan.validateMeasurementsFile(
      { uid: UID, day: DAY, measurements: [{ rawEventId: "a", steps: NaN }] },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects duplicate rawEventId", () => {
    const r = plan.validateMeasurementsFile(
      {
        uid: UID,
        day: DAY,
        measurements: [
          { rawEventId: "dup", steps: 1 },
          { rawEventId: "dup", steps: 2 },
        ],
      },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects missing rawEventId", () => {
    const r = plan.validateMeasurementsFile(
      { uid: UID, day: DAY, measurements: [{ steps: 1 }] },
      UID,
      DAY,
    );
    expect(r.ok).toBe(false);
  });
});

describe("planRepairForWorkout — positive measurement on fresh 0/0 workout", () => {
  it("produces an idempotent patch plan for raw + canonical", () => {
    const raw = buildRawWorkout();
    const canonical = buildCanonicalWorkout();
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 1843,
      rawDoc: raw,
      canonicalDoc: canonical,
      appliedAt: NOW,
    });

    expect(r.action).toBe("patch");
    if (r.action !== "patch") return;
    expect(r.correctedStepsValue).toBe(1843);
    expect(r.previousRawSteps).toBe(0);
    expect(r.previousCanonicalSteps).toBe(0);
    expect(r.canonicalPatch).toEqual({ steps: 1843, updatedAt: NOW });
    expect(r.rawPayloadPatch["steps"]).toBe(1843);
    const marker = r.rawPayloadPatch[plan.REPAIR_AUDIT_KEY] as Record<string, unknown>;
    expect(marker).toBeTruthy();
    expect(marker["version"]).toBe(plan.REPAIR_VERSION);
    expect(marker["appliedAt"]).toBe(NOW);
    expect(marker["previousStepsValue"]).toBe(0);
    expect(marker["correctedStepsValue"]).toBe(1843);
    expect(marker["source"]).toBe(plan.REPAIR_SOURCE);
    // Existing payload keys must be preserved on the merged patch
    expect(r.rawPayloadPatch["sport"]).toBe("running");
    expect(r.rawPayloadPatch["distanceMeters"]).toBe(4400);
  });

  it("rounds fractional measured steps", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 1842.6,
      rawDoc: buildRawWorkout(),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    if (r.action !== "patch") throw new Error("expected patch");
    expect(r.correctedStepsValue).toBe(1843);
  });
});

describe("planRepairForWorkout — null measurement (device reported no samples)", () => {
  it("skips without writing", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: null,
      rawDoc: buildRawWorkout(),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("device_reported_no_samples");
  });
});

describe("planRepairForWorkout — idempotency", () => {
  it("skips when raw already has positive steps", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 5000,
      rawDoc: buildRawWorkout({ payload: { steps: 1843 } }),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("already_repaired_or_nonzero");
  });

  it("skips when canonical already has positive steps", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 5000,
      rawDoc: buildRawWorkout(),
      canonicalDoc: buildCanonicalWorkout({ steps: 999 }),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("already_repaired_or_nonzero");
  });

  it("skips when raw payload already has an audit marker", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 5000,
      rawDoc: buildRawWorkout({
        payload: {
          steps: 0,
          [plan.REPAIR_AUDIT_KEY]: { version: 1, appliedAt: "earlier" },
        },
      }),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("already_repaired_or_nonzero");
  });
});

describe("planRepairForWorkout — measured zero", () => {
  it("skips with measured_zero_no_op", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 0,
      rawDoc: buildRawWorkout(),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("measured_zero_no_op");
  });
});

describe("planRepairForWorkout — guard rails", () => {
  it("skips when raw doc is missing", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 100,
      rawDoc: null,
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("raw_event_not_found");
  });

  it("skips when canonical doc is missing", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 100,
      rawDoc: buildRawWorkout(),
      canonicalDoc: null,
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toBe("canonical_event_not_found");
  });

  it("skips when raw kind !== workout", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 100,
      rawDoc: buildRawWorkout({ kind: "strength_workout" }),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
  });

  it("skips when raw provider !== apple_health", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 100,
      rawDoc: buildRawWorkout({ provider: "manual" }),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
  });

  it("skips when canonical id !== rawEventId", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: 100,
      rawDoc: buildRawWorkout(),
      canonicalDoc: buildCanonicalWorkout({ id: "different_id" }),
      appliedAt: NOW,
    });
    expect(r.action).toBe("skip");
    if (r.action !== "skip") return;
    expect(r.reason).toContain("canonical_id_mismatch");
  });

  it("errors on non-finite measurement", () => {
    const r = plan.planRepairForWorkout({
      rawEventId: RAW_ID,
      measuredSteps: Number.NaN,
      rawDoc: buildRawWorkout(),
      canonicalDoc: buildCanonicalWorkout(),
      appliedAt: NOW,
    });
    expect(r.action).toBe("error");
  });
});

describe("verifyAllocationPartition", () => {
  it("returns ok when sum equals total", () => {
    expect(
      plan.verifyAllocationPartition({
        steps: 10000,
        allocation: { neatSteps: 5000, strengthSteps: 2000, cardioSteps: 3000 },
      }),
    ).toEqual({ ok: true });
  });

  it("returns failure when partition is violated", () => {
    const r = plan.verifyAllocationPartition({
      steps: 10000,
      allocation: { neatSteps: 5000, strengthSteps: 2000, cardioSteps: 2500 },
    });
    expect(r.ok).toBe(false);
  });

  it("rounds before comparing", () => {
    expect(
      plan.verifyAllocationPartition({
        steps: 100.4,
        allocation: { neatSteps: 50.3, strengthSteps: 20.4, cardioSteps: 30.0 },
      }),
    ).toEqual({ ok: true });
  });
});

describe("validateBatchMeasurementsFile", () => {
  const UID = "uid-1";

  it("accepts a well-formed batch with multiple days", () => {
    const r = plan.validateBatchMeasurementsFile(
      {
        uid: UID,
        generatedAt: "2026-05-24T15:00:00.000Z",
        days: [
          {
            day: "2026-05-19",
            measurements: [{ rawEventId: "a", steps: 1500 }],
          },
          {
            day: "2026-05-20",
            measurements: [
              { rawEventId: "b", steps: 0 },
              { rawEventId: "c", steps: null },
            ],
          },
        ],
      },
      UID,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.uid).toBe(UID);
    expect(r.generatedAt).toBe("2026-05-24T15:00:00.000Z");
    expect(r.days.map((d) => d.day)).toEqual(["2026-05-19", "2026-05-20"]);
    expect(r.days[1]?.measurements.map((m) => m.steps)).toEqual([0, null]);
  });

  it("normalises a missing generatedAt to null", () => {
    const r = plan.validateBatchMeasurementsFile(
      {
        uid: UID,
        days: [
          { day: "2026-05-19", measurements: [{ rawEventId: "a", steps: 1 }] },
        ],
      },
      UID,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.generatedAt).toBe(null);
  });

  it("rejects when input is not an object", () => {
    expect(plan.validateBatchMeasurementsFile(null, UID).ok).toBe(false);
    expect(plan.validateBatchMeasurementsFile([], UID).ok).toBe(false);
    expect(plan.validateBatchMeasurementsFile("nope", UID).ok).toBe(false);
  });

  it("rejects when uid is missing or mismatched", () => {
    const missing = plan.validateBatchMeasurementsFile({ days: [] }, UID);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error).toMatch(/uid/i);

    const wrong = plan.validateBatchMeasurementsFile(
      { uid: "other", days: [] },
      UID,
    );
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.error).toMatch(/uid mismatch/);
  });

  it("rejects when days is not an array or is empty", () => {
    const notArray = plan.validateBatchMeasurementsFile({ uid: UID, days: {} }, UID);
    expect(notArray.ok).toBe(false);

    const empty = plan.validateBatchMeasurementsFile({ uid: UID, days: [] }, UID);
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.error).toMatch(/at least one entry/);
  });

  it("rejects invalid day keys per entry", () => {
    const r = plan.validateBatchMeasurementsFile(
      {
        uid: UID,
        days: [
          {
            day: "2026/05/19",
            measurements: [{ rawEventId: "a", steps: 1 }],
          },
        ],
      },
      UID,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/days\[0\]\.day/);
  });

  it("rejects duplicate day keys across entries", () => {
    const r = plan.validateBatchMeasurementsFile(
      {
        uid: UID,
        days: [
          { day: "2026-05-19", measurements: [{ rawEventId: "a", steps: 1 }] },
          { day: "2026-05-19", measurements: [{ rawEventId: "b", steps: 2 }] },
        ],
      },
      UID,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/duplicated/);
  });

  it("surfaces per-day measurement errors with the day prefix", () => {
    const r = plan.validateBatchMeasurementsFile(
      {
        uid: UID,
        days: [
          { day: "2026-05-19", measurements: [{ rawEventId: "a", steps: -5 }] },
        ],
      },
      UID,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/days\[0\] \(2026-05-19\)/);
    expect(r.error).toMatch(/must be null or a finite non-negative number/);
  });

  it("rejects a day with an empty measurements array (would be a no-op patch)", () => {
    const r = plan.validateBatchMeasurementsFile(
      {
        uid: UID,
        days: [{ day: "2026-05-19", measurements: [] }],
      },
      UID,
    );
    expect(r.ok).toBe(false);
  });
});
