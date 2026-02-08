// services/functions/src/normalization/__tests__/onRawEventCreated.factOnly.test.ts

/**
 * Sprint 0 — Option A: fact-only recompute triggering.
 * Proves: weight rawEvent triggers derived truth recompute without writing canonical events.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("firebase-functions/logger", () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

type SetCall = { path: string; data: Record<string, unknown> };
const mockSetCalls: SetCall[] = [];

jest.mock("../../firebaseAdmin", () => {
  const mkDocRef = (path: string) => ({
    path,
    async get() {
      if (path.endsWith("/dailyFacts/2025-01-01") || path.endsWith("/dailyFacts/2026-01-15")) {
        return { exists: false, data: () => undefined };
      }
      return { exists: false, data: () => undefined };
    },
    async set(data: Record<string, unknown>) {
      mockSetCalls.push({ path, data });
    },
  });

  const mkQuery = () => ({
    where: () => mkQuery(),
    async get() {
      return { docs: [] };
    },
  });

  const db = {
    collection(name: string) {
      return {
        doc(docId: string) {
          const base = `${name}/${docId}`;
          return {
            collection(sub: string) {
              return {
                doc(subId: string) {
                  return mkDocRef(`${base}/${sub}/${subId}`);
                },
                where() {
                  return mkQuery();
                },
                async get() {
                  return { docs: [] };
                },
              };
            },
          };
        },
      };
    },
    batch() {
      return {
        set: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(async () => undefined),
      };
    },
  };

  return { db };
});

jest.mock("../../pipeline/derivedLedger", () => ({
  makeLedgerRunIdFromSeed: () => "ledger_run_123",
  writeDerivedLedgerRun: jest.fn(async () => undefined),
}));

// Must be after firebaseAdmin mock
import { db } from "../../firebaseAdmin";
import { recomputeDerivedTruthForDay } from "../../pipeline/recomputeForDay";

describe("fact-only recompute", () => {
  beforeEach(() => {
    mockSetCalls.length = 0;
  });

  it("writes dailyFacts and intelligenceContext with meta.computedAt when given factOnlyBody", async () => {
    const userId = "u_test_fact_only";
    const dayKey = "2026-01-15";

    await recomputeDerivedTruthForDay({
      db,
      userId,
      dayKey,
      factOnlyBody: { weightKg: 73.5, bodyFatPercent: 18 },
      trigger: { type: "factOnly", rawEventId: "raw_weight_123" },
    });

    const dailyFactsCall = mockSetCalls.find((c) => c.path.endsWith(`/dailyFacts/${dayKey}`));
    expect(dailyFactsCall).toBeTruthy();
    expect(dailyFactsCall!.data.meta).toBeDefined();
    expect((dailyFactsCall!.data.meta as Record<string, unknown>).computedAt).toBeDefined();
    expect(dailyFactsCall!.data.body).toEqual({ weightKg: 73.5, bodyFatPercent: 18 });

    const intelligenceContextCall = mockSetCalls.find((c) =>
      c.path.endsWith(`/intelligenceContext/${dayKey}`),
    );
    expect(intelligenceContextCall).toBeTruthy();
    expect(intelligenceContextCall!.data.meta).toBeDefined();
    expect((intelligenceContextCall!.data.meta as Record<string, unknown>).computedAt).toBeDefined();
  });

  it("does NOT write to events collection (no canonical event created)", async () => {
    await recomputeDerivedTruthForDay({
      db,
      userId: "u_test",
      dayKey: "2026-01-15",
      factOnlyBody: { weightKg: 75 },
      trigger: { type: "factOnly", rawEventId: "raw_1" },
    });

    const eventsCalls = mockSetCalls.filter((c) => c.path.includes("/events/"));
    expect(eventsCalls).toHaveLength(0);
  });
});
