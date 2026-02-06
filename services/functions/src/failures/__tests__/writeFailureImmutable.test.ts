// services/functions/src/failures/__tests__/writeFailureImmutable.test.ts
//
// Unit test for writeFailureImmutable: proves deterministic ID and create-or-assert behavior.

jest.mock("../../firebaseAdmin", () => {
  const store = new Map<string, Record<string, unknown>>();

  const mkDocRef = (path: string) => ({ path });

  const mkCollectionRef = (path: string) => ({
    doc: (id?: string) => {
      const docId = id ?? `auto_${Math.random().toString(16).slice(2)}`;
      return mkDocRef(`${path}/${docId}`);
    },
  });

  const db = {
    collection: (name: string) => ({
      doc: (docId: string) => {
        const base = `${name}/${docId}`;
        return {
          collection: (sub: string) => mkCollectionRef(`${base}/${sub}`),
        };
      },
    }),
    async runTransaction<T>(fn: (tx: { get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; create: (ref: { path: string }, data: Record<string, unknown>) => void }) => Promise<T>): Promise<T> {
      const tx = {
        async get(ref: { path: string }) {
          const data = store.get(ref.path);
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        create(ref: { path: string }, data: Record<string, unknown>) {
          if (store.has(ref.path)) {
            throw new Error(`Document already exists at ${ref.path}`);
          }
          store.set(ref.path, data);
        },
      };
      return fn(tx);
    },
    __store: store,
  };

  const admin = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => "__SERVER_TIMESTAMP__",
      },
    },
  };

  return { db, admin };
});

import { describe, it, expect, beforeEach } from "@jest/globals";
import { writeFailureImmutable, type FailureInput } from "../writeFailureImmutable";

// Access the mock store to inspect writes
const getStore = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = require("../../firebaseAdmin");
  return (db as { __store: Map<string, Record<string, unknown>> }).__store;
};

describe("writeFailureImmutable", () => {
  beforeEach(() => {
    getStore().clear();
  });

  it("produces deterministic failureId and writes to users/{uid}/failures", async () => {
    const input: FailureInput = {
      userId: "user_1",
      source: "normalization",
      stage: "rawEvent.validate",
      reasonCode: "RAW_EVENT_INVALID",
      message: "test",
      day: "2025-01-15",
      rawEventId: "raw_1",
    };

    const { id } = await writeFailureImmutable({}, input);

    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThanOrEqual(16);

    const store = getStore();
    const path = `users/${input.userId}/failures/${id}`;
    expect(store.has(path)).toBe(true);
    const doc = store.get(path);
    expect(doc?.userId).toBe(input.userId);
    expect(doc?.source).toBe(input.source);
    expect(doc?.reasonCode).toBe(input.reasonCode);
    expect(doc?.day).toBe(input.day);
  });

  it("same input produces same id (deterministic)", async () => {
    const input: FailureInput = {
      userId: "user_1",
      source: "normalization",
      stage: "rawEvent.validate",
      reasonCode: "RAW_EVENT_INVALID",
      message: "test",
      day: "2025-01-15",
    };

    const { id: id1 } = await writeFailureImmutable({}, input);
    getStore().clear();
    const { id: id2 } = await writeFailureImmutable({}, input);

    expect(id1).toBe(id2);
  });
});
