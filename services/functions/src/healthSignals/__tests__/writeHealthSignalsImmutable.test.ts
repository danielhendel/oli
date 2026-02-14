// services/functions/src/healthSignals/__tests__/writeHealthSignalsImmutable.test.ts
// Phase 1.5 Sprint 4 — same write ok, different write fails (immutability proof)

import { describe, it, expect, beforeEach } from "@jest/globals";
import { writeHealthSignalsImmutable } from "../writeHealthSignalsImmutable";
import type { HealthSignalDocResult } from "../computeHealthSignalsV1";
import { REQUIRED_DOMAINS } from "../constants";

function makeMockFirestore(): {
  db: {
    collection: () => {
      doc: (userId: string) => {
        collection: () => {
          doc: (dayKey: string) => { path: string };
        };
      };
    };
    runTransaction: (fn: (tx: unknown) => Promise<void>) => Promise<void>;
  };
  store: Map<string, Record<string, unknown>>;
} {
  const store = new Map<string, Record<string, unknown>>();

  const runTransaction = async (
    fn: (tx: {
      get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
      set: (ref: { path: string }, data: Record<string, unknown>) => void;
    }) => Promise<void>,
  ) => {
    const tx = {
      async get(ref: { path: string }) {
        const data = store.get(ref.path);
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      set(ref: { path: string }, data: Record<string, unknown>) {
        store.set(ref.path, data);
      },
    };
    return fn(tx);
  };

  const db = {
    collection: () => ({
      doc: (userId: string) => ({
        collection: () => ({
          doc: (dayKey: string) => ({
            path: `users/${userId}/healthSignals/${dayKey}`,
          }),
        }),
      }),
    }),
    runTransaction,
  };

  return { db, store };
}

const baseDoc: HealthSignalDocResult = {
  schemaVersion: 1,
  modelVersion: "1.0",
  date: "2026-01-15",
  status: "stable",
  readiness: "ready",
  computedAt: "2026-01-15T12:00:00.000Z",
  pipelineVersion: 1,
  inputs: {
    healthScoreDayKey: "2026-01-15",
    baselineWindowDays: 14,
    baselineDaysPresent: 0,
    thresholds: {
      compositeAttentionLt: 65,
      domainAttentionLt: 60,
      deviationAttentionPctLt: -0.15,
    },
  },
  reasons: [],
  missingInputs: [],
  domainEvidence: Object.fromEntries(
    REQUIRED_DOMAINS.map((d) => [
      d,
      { score: 70, baselineMean: 0, deviationPct: null },
    ]),
  ) as HealthSignalDocResult["domainEvidence"],
};

describe("writeHealthSignalsImmutable", () => {
  let mock: ReturnType<typeof makeMockFirestore>;

  beforeEach(() => {
    mock = makeMockFirestore();
  });

  it("first write succeeds and stores doc", async () => {
    await writeHealthSignalsImmutable({
      db: mock.db as unknown as FirebaseFirestore.Firestore,
      userId: "u1",
      dayKey: "2026-01-15",
      doc: baseDoc,
    });
    expect(mock.store.get("users/u1/healthSignals/2026-01-15")).toBeDefined();
    const stored = mock.store.get("users/u1/healthSignals/2026-01-15");
    expect(stored?.status).toBe("stable");
    expect(stored?.date).toBe("2026-01-15");
  });

  it("same write again succeeds (idempotent)", async () => {
    await writeHealthSignalsImmutable({
      db: mock.db as unknown as FirebaseFirestore.Firestore,
      userId: "u1",
      dayKey: "2026-01-15",
      doc: baseDoc,
    });
    await expect(
      writeHealthSignalsImmutable({
        db: mock.db as unknown as FirebaseFirestore.Firestore,
        userId: "u1",
        dayKey: "2026-01-15",
        doc: baseDoc,
      }),
    ).resolves.not.toThrow();
  });

  it("different write throws (immutability violation)", async () => {
    await writeHealthSignalsImmutable({
      db: mock.db as unknown as FirebaseFirestore.Firestore,
      userId: "u1",
      dayKey: "2026-01-15",
      doc: baseDoc,
    });
    const otherDoc: HealthSignalDocResult = {
      ...baseDoc,
      status: "attention_required",
      reasons: ["composite_below_threshold"],
    };
    await expect(
      writeHealthSignalsImmutable({
        db: mock.db as unknown as FirebaseFirestore.Firestore,
        userId: "u1",
        dayKey: "2026-01-15",
        doc: otherDoc,
      }),
    ).rejects.toThrow(/immutability violation/);
  });
});
