/**
 * Sleep canonical documents share id with RawEvent; newer raw deliveries replace older canonical.
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

import type { SleepCanonicalEvent } from "../../types/health";
import { writeCanonicalEventImmutable } from "../writeCanonicalEventImmutable";

function sleepCanon(
  updatedAt: string,
  extra: Partial<SleepCanonicalEvent> = {},
): SleepCanonicalEvent {
  return {
    id: "oura_sleep_1",
    userId: "u1",
    sourceId: "oura",
    kind: "sleep",
    start: "2025-01-01T22:00:00.000Z",
    end: "2025-01-02T06:00:00.000Z",
    day: "2025-01-01",
    timezone: "UTC",
    createdAt: "2025-01-02T01:00:00.000Z",
    updatedAt,
    schemaVersion: 1,
    totalMinutes: 480,
    isMainSleep: true,
    ...extra,
  };
}

describe("writeCanonicalEventImmutable — sleep supersede", () => {
  beforeEach(() => {
    mockTransactionStore.clear();
  });

  it("replaces sleep when incoming updatedAt is newer", async () => {
    const path = "users/u1/events/oura_sleep_1";
    mockTransactionStore.set(path, sleepCanon("2025-01-02T01:00:00.000Z") as unknown as Record<string, unknown>);

    const incoming = sleepCanon("2025-01-03T01:00:00.000Z", {
      remSleepMinutes: 90,
      deepSleepMinutes: 70,
    });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "oura_sleep_1",
      sourceRawEventPath: "users/u1/rawEvents/oura_sleep_1",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.mode).toBe("replaced");
    const stored = mockTransactionStore.get(path) as unknown as SleepCanonicalEvent;
    expect(stored.remSleepMinutes).toBe(90);
    expect(stored.deepSleepMinutes).toBe(70);
  });

  it("returns sleepDayMovedFrom when canonical day changes on supersede", async () => {
    const path = "users/u1/events/oura_sleep_1";
    mockTransactionStore.set(
      path,
      sleepCanon("2025-01-02T01:00:00.000Z", { day: "2026-04-18" }) as unknown as Record<string, unknown>,
    );

    const incoming = sleepCanon("2025-01-03T01:00:00.000Z", { day: "2026-04-19" });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: incoming,
      sourceRawEventId: "oura_sleep_1",
      sourceRawEventPath: "users/u1/rawEvents/oura_sleep_1",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.mode).toBe("replaced");
    expect(res.sleepDayMovedFrom).toBe("2026-04-18");
  });

  it("no-ops when incoming updatedAt is older", async () => {
    const path = "users/u1/events/oura_sleep_1";
    mockTransactionStore.set(
      path,
      sleepCanon("2025-01-03T01:00:00.000Z", { remSleepMinutes: 90 }) as unknown as Record<string, unknown>,
    );

    const stale = sleepCanon("2025-01-02T01:00:00.000Z", { remSleepMinutes: 0 });

    const res = await writeCanonicalEventImmutable({
      userId: "u1",
      canonical: stale,
      sourceRawEventId: "oura_sleep_1",
      sourceRawEventPath: "users/u1/rawEvents/oura_sleep_1",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.mode).toBe("identical_noop");
    const stored = mockTransactionStore.get(path) as unknown as SleepCanonicalEvent;
    expect(stored.remSleepMinutes).toBe(90);
  });
});
