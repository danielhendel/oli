// services/functions/src/ingestion/__tests__/rawEventDedupe.test.ts

jest.mock("firebase-functions/logger", () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }));
  
  // IMPORTANT: mock firebaseAdmin BEFORE importing the module under test.
  jest.mock("../../firebaseAdmin", () => {
    // Simple in-memory document store keyed by path
    const store = new Map<string, Record<string, unknown>>();
  
    const mkDocRef = (path: string) => ({ path });
  
    const mkCollectionRef = (path: string) => ({
      doc(id?: string) {
        const docId = id ?? `auto_${Math.random().toString(16).slice(2)}`;
        return mkDocRef(`${path}/${docId}`);
      },
    });
  
    const db = {
      collection(name: string) {
        return {
          doc(docId: string) {
            const base = `${name}/${docId}`;
            return {
              collection(sub: string) {
                return mkCollectionRef(`${base}/${sub}`);
              },
            };
          },
        };
      },
  
      async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
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
  
  import { upsertRawEventDedupeEvidence } from "../rawEventDedupe";
  
  describe("rawEventDedupe", () => {
    it("creates index on first seen and writes integrity violation on duplicate", async () => {
      const userId = "u_test";
  
      const raw1 = {
        schemaVersion: 1,
        id: "raw_a",
        userId,
        sourceId: "src_1",
        provider: "manual",
        sourceType: "manual",
        kind: "sleep",
        receivedAt: "2026-01-01T08:00:00.000Z",
        observedAt: "2026-01-01T07:00:00.000Z",
        payload: {
          start: "2026-01-01T00:00:00.000Z",
          end: "2026-01-01T07:00:00.000Z",
          timezone: "America/New_York",
          totalMinutes: 420,
          isMainSleep: true,
        },
      } as const;
  
      const raw2 = { ...raw1, id: "raw_b" };
  
      const a = await upsertRawEventDedupeEvidence({ userId, rawEvent: raw1 });
      expect(a.ok).toBe(true);
      if (!a.ok) throw new Error(`Unexpected invalid contract: ${a.reason}`);
      expect(a.mode).toBe("first_seen");
  
      const b = await upsertRawEventDedupeEvidence({ userId, rawEvent: raw2 });
      expect(b.ok).toBe(true);
      if (!b.ok) throw new Error(`Unexpected invalid contract: ${b.reason}`);
      expect(b.mode).toBe("duplicate");
  
      if (b.mode === "duplicate") {
        expect(b.firstRawEventId).toBe("raw_a");
        expect(b.integrityViolationPath).toContain(
          `users/${userId}/integrityViolations/`,
        );
      } else {
        throw new Error("Expected duplicate mode on second insert");
      }
    });
  });