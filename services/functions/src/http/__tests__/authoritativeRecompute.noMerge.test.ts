// services/functions/src/http/__tests__/authoritativeRecompute.noMerge.test.ts

jest.mock("firebase-functions/logger", () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }));
  
  /**
   * This test is intentionally narrow:
   * It proves Step 3's Phase-1 invariant: recompute writers are authoritative
   * and do NOT use { merge: true } (which would allow stale fields to survive).
   */
  
  type SetCall = {
    path: string;
    data: Record<string, unknown>;
    options: unknown | undefined;
  };
  
  const mockSetCalls: SetCall[] = [];
  
  jest.mock("../../firebaseAdmin", () => {
    const mkDocRef = (path: string) => ({
        path,
        async get() {
          // IntelligenceContext recompute requires DailyFacts to exist.
          if (path.endsWith("/dailyFacts/2026-01-01")) {
            return {
              exists: true,
              data: () => ({
                userId: "u_test",
                date: "2026-01-01",
                computedAt: "now",
              }),
            };
          }
      
          return { exists: false, data: () => undefined };
        },
        async set(data: Record<string, unknown>, options?: unknown) {
          mockSetCalls.push({ path, data, options });
        },
      });
  
    /**
     * Chainable query mock:
     * Supports where().where().get() as used by recomputeDailyFactsAdminHttp.
     */
    const mkQuery = () => {
      const q = {
        where: () => q,
        async get() {
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
                  where() {
                    return mkQuery();
                  },
                  async get() {
                    return { docs: [] as { data: () => unknown }[] };
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
  
  import { recomputeDailyFactsAdminHttp } from "../recomputeDailyFactsAdminHttp";
  import { recomputeDailyIntelligenceContextAdminHttp } from "../recomputeDailyIntelligenceContextAdminHttp";
  
  // Minimal admin auth mock: both handlers call requireAdmin()
  jest.mock("../adminAuth", () => ({
    requireAdmin: async () => ({ ok: true, status: 200, message: "ok" }),
  }));
  
  // Minimal pipeline deps mocked to avoid pulling real logic.
  // We only care that the handler writes via ref.set(...) without merge.
  jest.mock("../../dailyFacts/aggregateDailyFacts", () => ({
    aggregateDailyFactsForDay: () => ({ date: "2026-01-01", userId: "u", computedAt: "now" }),
  }));
  
  jest.mock("../../dailyFacts/enrichDailyFacts", () => ({
    enrichDailyFactsWithBaselinesAndAverages: ({ today }: { today: unknown }) => today,
  }));
  
  jest.mock("../../intelligence/buildDailyIntelligenceContext", () => ({
    buildDailyIntelligenceContext: () => ({ date: "2026-01-01", userId: "u", computedAt: "now" }),
  }));
  
  jest.mock("../../pipeline/pipelineMeta", () => ({
    buildPipelineMeta: () => ({ readiness: "READY" }),
  }));
  
  /**
   * Small helper to call onRequest handlers (firebase-functions v2).
   * We invoke the exported function as a normal async fn with req/res.
   */
  const makeReqRes = (body: unknown) => {
    const req = {
      body,
      header: () => "Bearer test",
    } as unknown as Parameters<typeof recomputeDailyFactsAdminHttp>[0];
  
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as Parameters<typeof recomputeDailyFactsAdminHttp>[1];
  
    return { req, res };
  };
  
  describe("Authoritative recompute writes (no merge)", () => {
    beforeEach(() => {
      mockSetCalls.length = 0;
    });
  
    it("DailyFacts admin recompute overwrites doc (no merge option)", async () => {
      const { req, res } = makeReqRes({ userId: "u_test", date: "2026-01-01" });
  
      await recomputeDailyFactsAdminHttp(req, res);
  
      const call = mockSetCalls.find((c) => c.path.endsWith("/dailyFacts/2026-01-01"));
      expect(call).toBeTruthy();
  
      // Critical assertion: there must be NO merge option.
      expect(call?.options).toBeUndefined();
    });
  
    it("IntelligenceContext admin recompute overwrites doc (no merge option)", async () => {
      const { req, res } = makeReqRes({ userId: "u_test", date: "2026-01-01" });
  
      await recomputeDailyIntelligenceContextAdminHttp(req, res);
  
      const call = mockSetCalls.find((c) => c.path.endsWith("/intelligenceContext/2026-01-01"));
      expect(call).toBeTruthy();
  
      // Critical assertion: there must be NO merge option.
      expect(call?.options).toBeUndefined();
    });
  });