/**
 * Same-id Apple Health / manual daily steps must update intraday without immutability conflict.
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
          if (mockTransactionStore.has(ref.path)) {
            throw new Error("ALREADY_EXISTS");
          }
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

import type { StepsCanonicalEvent } from "../../types/health";
import { writeCanonicalEventImmutable } from "../writeCanonicalEventImmutable";

function stepsCanonical(steps: number, updatedAt: string): StepsCanonicalEvent {
  return {
    id: "appleHealth:v2:steps:2026-04-08",
    userId: "u_steps",
    sourceId: "manual",
    kind: "steps",
    start: "2026-04-08T04:00:00.000Z",
    end: "2026-04-09T03:59:59.999Z",
    day: "2026-04-08",
    timezone: "America/New_York",
    createdAt: "2026-04-08T08:00:00.000Z",
    updatedAt,
    schemaVersion: 1,
    steps,
    distanceKm: null,
    moveMinutes: null,
  };
}

describe("writeCanonicalEventImmutable — steps intraday", () => {
  beforeEach(() => {
    mockTransactionStore.clear();
  });

  it("returns replaced and overwrites when same id steps total changes", async () => {
    const path = "users/u_steps/events/appleHealth:v2:steps:2026-04-08";
    mockTransactionStore.set(path, { ...stepsCanonical(37, "2026-04-08T08:00:00.000Z") } as Record<string, unknown>);

    const res = await writeCanonicalEventImmutable({
      userId: "u_steps",
      canonical: { ...stepsCanonical(5834, "2026-04-08T18:00:00.000Z") },
      sourceRawEventId: "appleHealth:v2:steps:2026-04-08",
      sourceRawEventPath: "users/u_steps/rawEvents/appleHealth:v2:steps:2026-04-08",
    });

    expect(res).toEqual({ ok: true, mode: "replaced" });
    expect((mockTransactionStore.get(path) as { steps?: number }).steps).toBe(5834);
  });

  it("returns identical_noop when steps canonical is unchanged", async () => {
    const c = stepsCanonical(100, "2026-04-08T12:00:00.000Z");
    const path = "users/u_steps/events/appleHealth:v2:steps:2026-04-08";
    mockTransactionStore.set(path, { ...c } as Record<string, unknown>);

    const res = await writeCanonicalEventImmutable({
      userId: "u_steps",
      canonical: { ...c },
      sourceRawEventId: "appleHealth:v2:steps:2026-04-08",
      sourceRawEventPath: "x",
    });

    expect(res).toEqual({ ok: true, mode: "identical_noop" });
  });

  it("does not reduce steps when a lower cumulative total arrives out of order", async () => {
    const path = "users/u_steps/events/appleHealth:v2:steps:2026-04-08";
    mockTransactionStore.set(path, { ...stepsCanonical(5000, "2026-04-08T20:00:00.000Z") } as Record<string, unknown>);

    const res = await writeCanonicalEventImmutable({
      userId: "u_steps",
      canonical: { ...stepsCanonical(133, "2026-04-08T08:00:00.000Z") },
      sourceRawEventId: "appleHealth:v2:steps:2026-04-08",
      sourceRawEventPath: "x",
    });

    expect(res).toEqual({ ok: true, mode: "identical_noop" });
    expect((mockTransactionStore.get(path) as { steps?: number }).steps).toBe(5000);
  });
});
