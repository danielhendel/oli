/**
 * Workout Physiology v1 — additive-only canonical workout supersede tests.
 *
 * Acceptance:
 * - Absent → present for any physiology field replaces canonical when updatedAt newer.
 * - Existing physiology values are NEVER overwritten by different incoming values
 *   (existing value present + incoming different → conflict path).
 * - Truth fields (sport, durationMinutes, day, …) cannot change via supersede.
 * - Older or equal updatedAt → no-op even when other fields would qualify.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("firebase-functions/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const mockTransactionStore = new Map<string, Record<string, unknown>>();

jest.mock("../../firebaseAdmin", () => ({
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: () => ({}),
      },
    },
  },
  db: {
    collection(col: string) {
      return {
        doc(id: string) {
          const base = `${col}/${id}`;
          return {
            collection(sub: string) {
              return {
                doc(subId: string) {
                  const path = `${base}/${sub}/${subId}`;
                  return { path };
                },
              };
            },
          };
        },
      };
    },
    runTransaction<T>(
      fn: (tx: {
        get: (ref: { path: string }) => Promise<{
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        create: (ref: { path: string }, data: Record<string, unknown>) => void;
        set: (ref: { path: string }, data: Record<string, unknown>) => void;
      }) => Promise<T>,
    ): Promise<T> {
      const tx = {
        async get(ref: { path: string }) {
          const d = mockTransactionStore.get(ref.path);
          return { exists: mockTransactionStore.has(ref.path), data: () => d };
        },
        create(ref: { path: string }, data: Record<string, unknown>) {
          if (mockTransactionStore.has(ref.path)) throw new Error("ALREADY_EXISTS");
          mockTransactionStore.set(ref.path, { ...data });
        },
        set(ref: { path: string }, data: Record<string, unknown>) {
          mockTransactionStore.set(ref.path, { ...data });
        },
      };
      return fn(tx);
    },
  },
}));

import type { WorkoutCanonicalEvent } from "../../types/health";
import { writeCanonicalEventImmutable } from "../writeCanonicalEventImmutable";

function workoutCanon(
  updatedAt: string,
  extra: Partial<WorkoutCanonicalEvent> = {},
): WorkoutCanonicalEvent {
  return {
    id: "ah_workout_1",
    userId: "u1",
    sourceId: "healthkit",
    kind: "workout",
    start: "2026-03-01T10:00:00.000Z",
    end: "2026-03-01T10:30:00.000Z",
    day: "2026-03-01",
    timezone: "UTC",
    createdAt: "2026-03-01T10:30:01.000Z",
    updatedAt,
    schemaVersion: 1,
    sport: "Running",
    durationMinutes: 30,
    trainingLoad: null,
    ...extra,
  };
}

describe("writeCanonicalEventImmutable — workout physiology supersede", () => {
  beforeEach(() => {
    mockTransactionStore.clear();
  });

  it("creates fresh canonical when none exists (baseline)", async () => {
    const incoming = workoutCanon("2026-03-01T10:30:01.000Z", { activeEnergyKcal: 380 });
    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.mode).toBe("created");
  });

  it("supersedes when incoming adds physiology fields and updatedAt is newer", async () => {
    const path = "users/u1/events/ah_workout_1";
    mockTransactionStore.set(
      path,
      workoutCanon("2026-03-01T10:30:01.000Z") as unknown as Record<string, unknown>,
    );

    const incoming = workoutCanon("2026-03-01T11:00:00.000Z", {
      activeEnergyKcal: 380,
      basalEnergyKcal: 35,
      totalEnergyKcal: 415,
      averageHeartRateBpm: 142,
      maxHeartRateBpm: 172,
      heartRateZoneMinutes: [2, 5, 18, 4, 1],
      heartRateZoneBasis: {
        modelVersion: "default_thresholds_v1",
        thresholdsBpm: [110, 130, 150, 170],
        userMaxHrBpm: null,
        computedFromSampleCount: 30,
      },
      postWorkoutHeartRate: {
        windowSeconds: 120,
        startBpm: 150,
        endBpm: 110,
        dropBpm: 40,
        sampleCount: 8,
      },
      physiologyVersion: 1,
    });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.mode).toBe("replaced");

    const stored = mockTransactionStore.get(path) as unknown as WorkoutCanonicalEvent;
    expect(stored.activeEnergyKcal).toBe(380);
    expect(stored.heartRateZoneMinutes).toEqual([2, 5, 18, 4, 1]);
    expect(stored.physiologyVersion).toBe(1);
  });

  it("rejects supersede when an existing physiology value differs from incoming", async () => {
    const path = "users/u1/events/ah_workout_1";
    mockTransactionStore.set(
      path,
      workoutCanon("2026-03-01T10:30:01.000Z", {
        activeEnergyKcal: 380,
      }) as unknown as Record<string, unknown>,
    );

    const incoming = workoutCanon("2026-03-01T11:00:00.000Z", {
      activeEnergyKcal: 999, // different! → must NOT overwrite
    });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected conflict");
    expect(res.mode).toBe("conflict");
    const stored = mockTransactionStore.get(path) as unknown as WorkoutCanonicalEvent;
    expect(stored.activeEnergyKcal).toBe(380);
  });

  it("rejects supersede when truth fields change (e.g. sport, durationMinutes)", async () => {
    const path = "users/u1/events/ah_workout_1";
    mockTransactionStore.set(
      path,
      workoutCanon("2026-03-01T10:30:01.000Z") as unknown as Record<string, unknown>,
    );

    const incoming = workoutCanon("2026-03-01T11:00:00.000Z", {
      sport: "Cycling",
      durationMinutes: 60,
      activeEnergyKcal: 380,
    });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected conflict");
    expect(res.mode).toBe("conflict");
  });

  it("no-ops when updatedAt is not strictly newer", async () => {
    const path = "users/u1/events/ah_workout_1";
    mockTransactionStore.set(
      path,
      workoutCanon("2026-03-01T11:00:00.000Z") as unknown as Record<string, unknown>,
    );

    const incoming = workoutCanon("2026-03-01T11:00:00.000Z", {
      activeEnergyKcal: 380,
    });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });

    // Same updatedAt + content differs in additive-only direction → still rejected by gate
    // because gate requires STRICT newer updatedAt. Falls through to conflict.
    expect(res.ok).toBe(false);
  });

  it("identical-noop when nothing changed", async () => {
    const path = "users/u1/events/ah_workout_1";
    const baseline = workoutCanon("2026-03-01T10:30:01.000Z", {
      activeEnergyKcal: 380,
      physiologyVersion: 1,
    });
    mockTransactionStore.set(path, baseline as unknown as Record<string, unknown>);

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: baseline,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.mode).toBe("identical_noop");
  });

  it("rejects supersede when existing HR avg/max differs from incoming", async () => {
    const path = "users/u1/events/ah_workout_1";
    mockTransactionStore.set(
      path,
      workoutCanon("2026-03-01T10:30:01.000Z", {
        averageHeartRateBpm: 140,
      }) as unknown as Record<string, unknown>,
    );

    const incoming = workoutCanon("2026-03-01T11:00:00.000Z", {
      averageHeartRateBpm: 999, // existing → present, incoming differs → conflict
    });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "ah_workout_1",
      sourceRawEventPath: "users/u1/rawEvents/ah_workout_1",
    });
    expect(res.ok).toBe(false);
  });
});
