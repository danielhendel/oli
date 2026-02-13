// services/functions/src/healthScore/__tests__/writeHealthScoreImmutable.test.ts
// Phase 1.5 Sprint 1 — same write ok, different write throws (immutability proof)

import { describe, it, expect, beforeEach } from "@jest/globals";
import { writeHealthScoreImmutable } from "../writeHealthScoreImmutable";
import type { HealthScoreResult } from "../computeHealthScoreV1";

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
            path: `users/${userId}/healthScores/${dayKey}`,
          }),
        }),
      }),
    }),
    runTransaction,
  };

  return { db, store };
}

const baseDoc: HealthScoreResult = {
  schemaVersion: 1,
  modelVersion: "1.0",
  date: "2026-01-15",
  compositeScore: 50,
  compositeTier: "fair",
  domainScores: {
    recovery: { score: 40, tier: "fair", missing: [] },
    training: { score: 60, tier: "good", missing: [] },
    nutrition: { score: 50, tier: "fair", missing: [] },
    body: { score: 50, tier: "fair", missing: [] },
  },
  status: "attention_required",
  computedAt: "2026-01-15T12:00:00.000Z",
  pipelineVersion: 1,
  inputs: { hasDailyFacts: true, historyDaysUsed: 0 },
};

describe("writeHealthScoreImmutable", () => {
  let mock: ReturnType<typeof makeMockFirestore>;

  beforeEach(() => {
    mock = makeMockFirestore();
  });

  it("first write succeeds and stores doc", async () => {
    await writeHealthScoreImmutable({
      db: mock.db as unknown as FirebaseFirestore.Firestore,
      userId: "u1",
      dayKey: "2026-01-15",
      doc: baseDoc,
    });
    expect(mock.store.get("users/u1/healthScores/2026-01-15")).toBeDefined();
    const stored = mock.store.get("users/u1/healthScores/2026-01-15");
    expect(stored?.compositeScore).toBe(50);
    expect(stored?.date).toBe("2026-01-15");
  });

  it("same write again succeeds (idempotent)", async () => {
    await writeHealthScoreImmutable({
      db: mock.db as unknown as FirebaseFirestore.Firestore,
      userId: "u1",
      dayKey: "2026-01-15",
      doc: baseDoc,
    });
    await expect(
      writeHealthScoreImmutable({
        db: mock.db as unknown as FirebaseFirestore.Firestore,
        userId: "u1",
        dayKey: "2026-01-15",
        doc: baseDoc,
      }),
    ).resolves.not.toThrow();
  });

  it("different write throws (immutability violation)", async () => {
    await writeHealthScoreImmutable({
      db: mock.db as unknown as FirebaseFirestore.Firestore,
      userId: "u1",
      dayKey: "2026-01-15",
      doc: baseDoc,
    });
    const otherDoc: HealthScoreResult = {
      ...baseDoc,
      compositeScore: 60,
      compositeTier: "good",
    };
    await expect(
      writeHealthScoreImmutable({
        db: mock.db as unknown as FirebaseFirestore.Firestore,
        userId: "u1",
        dayKey: "2026-01-15",
        doc: otherDoc,
      }),
    ).rejects.toThrow(/immutability violation/);
  });
});
