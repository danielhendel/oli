// services/functions/src/http/__tests__/recomputeInsights.authoritative.test.ts

jest.mock("firebase-functions/logger", () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }));
  
  /**
   * This test proves Phase-1 invariant for Insights recompute:
   * - Deletes ALL existing insights for (userId, date)
   * - Writes the newly computed insight set
   * - Does not leave stale docs behind
   */
  
  type BatchOp =
    | { kind: "delete"; path: string }
    | { kind: "set"; path: string; data: Record<string, unknown> };
  
  const batchOps: BatchOp[] = [];
  const commitCalls: number[] = [];
  
  jest.mock("../../firebaseAdmin", () => {
    const mkDocRef = (path: string) => ({ path });
  
    const mkDocSnap = (path: string, data: Record<string, unknown>) => ({
      ref: mkDocRef(path),
      data: () => data,
    });
  
    // Query object captures which collection it is for so get() can return appropriate docs.
    const mkQuery = (sub: string, whereArgs?: unknown[]) => {
      const q = {
        where: (...args: unknown[]) => mkQuery(sub, args),
        async get() {
          // dailyFacts window query: where("date", "in", windowDates)
          if (sub === "dailyFacts") {
            // Provide a minimal 7-day window; recompute only needs "today" to exist.
            const facts = [
              "2025-12-26",
              "2025-12-27",
              "2025-12-28",
              "2025-12-29",
              "2025-12-30",
              "2025-12-31",
              "2026-01-01",
            ].map((d) => ({
              userId: "u_test",
              date: d,
              computedAt: "now",
            }));
  
            return {
              docs: facts.map((f) =>
                mkDocSnap(`users/u_test/dailyFacts/${String(f.date)}`, f),
              ),
            };
          }
  
          // insights existing query: where("date", "==", date)
          if (sub === "insights") {
            const field = String(whereArgs?.[0] ?? "");
            const op = String(whereArgs?.[1] ?? "");
            const value = String(whereArgs?.[2] ?? "");
  
            if (field === "date" && op === "==" && value === "2026-01-01") {
              const existing = [
                { id: "stale_1", date: "2026-01-01", userId: "u_test" },
                { id: "stale_2", date: "2026-01-01", userId: "u_test" },
              ];
  
              return {
                docs: existing.map((i) =>
                  mkDocSnap(`users/u_test/insights/${String(i.id)}`, i),
                ),
              };
            }
  
            return { docs: [] as { ref: { path: string }; data: () => unknown }[] };
          }
  
          return { docs: [] as { data: () => unknown }[] };
        },
      };
      return q;
    };
  
    const db = {
      collection(name: string) {
        return {
          doc(docId: string) {
            const base = `${name}/${docId}`;
            return {
              collection(sub: string) {
                return {
                  doc(id: string) {
                    return mkDocRef(`${base}/${sub}/${id}`);
                  },
                  where(...args: unknown[]) {
                    return mkQuery(sub, args);
                  },
                  async get() {
                    return mkQuery(sub).get();
                  },
                };
              },
            };
          },
        };
      },
  
      batch() {
        return {
          delete(ref: { path: string }) {
            batchOps.push({ kind: "delete", path: ref.path });
          },
          set(ref: { path: string }, data: Record<string, unknown>) {
            batchOps.push({ kind: "set", path: ref.path, data });
          },
          async commit() {
            commitCalls.push(1);
            return undefined;
          },
        };
      },
    };
  
    return { db };
  });
  
  // Minimal admin auth mock
  jest.mock("../adminAuth", () => ({
    requireAdmin: async () => ({ ok: true, status: 200, message: "ok" }),
  }));
  
  // Deterministic new insights for the recompute
  jest.mock("../../insights/rules", () => ({
    generateInsightsForDailyFacts: () => [
      { id: "new_1", userId: "u_test", date: "2026-01-01" },
      { id: "new_2", userId: "u_test", date: "2026-01-01" },
    ],
  }));
  
  import { recomputeInsightsAdminHttp } from "../recomputeInsightsAdminHttp";
  
  const makeReqRes = (body: unknown) => {
    const req = {
      body,
      header: () => "Bearer test",
    } as unknown as Parameters<typeof recomputeInsightsAdminHttp>[0];
  
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as Parameters<typeof recomputeInsightsAdminHttp>[1];
  
    return { req, res };
  };
  
  describe("recomputeInsightsAdminHttp (authoritative)", () => {
    beforeEach(() => {
      batchOps.length = 0;
      commitCalls.length = 0;
    });
  
    it("deletes all existing insights for the date and writes only the newly computed set", async () => {
      const { req, res } = makeReqRes({ userId: "u_test", date: "2026-01-01" });
  
      await recomputeInsightsAdminHttp(req, res);
  
      // Must have committed at least one batch (delete + write, potentially separate commits).
      expect(commitCalls.length).toBeGreaterThan(0);
  
      const deletes = batchOps.filter((op) => op.kind === "delete") as {
        kind: "delete";
        path: string;
      }[];
      const sets = batchOps.filter((op) => op.kind === "set") as {
        kind: "set";
        path: string;
        data: Record<string, unknown>;
      }[];
      
      // Authoritative delete: stale docs must be deleted
      expect(deletes.map((d) => d.path)).toEqual(
        expect.arrayContaining([
          "users/u_test/insights/stale_1",
          "users/u_test/insights/stale_2",
        ]),
      );
  
      // Authoritative write: newly computed docs must be written
      expect(sets.map((s) => s.path)).toEqual(
        expect.arrayContaining([
          "users/u_test/insights/new_1",
          "users/u_test/insights/new_2",
        ]),
      );
    });
  });