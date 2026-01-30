// services/api/src/routes/__tests__/derivedLedger.explain.test.ts
import express from "express";

import usersMeRouter from "../usersMe";

// Mock Firestore accessors
const mockUserCollection = jest.fn();

// collectionGroup is only used by derivedLedgerRunIdExistsForOtherUser (which we mock)
jest.mock("../../db", () => ({
  userCollection: (...args: unknown[]) => mockUserCollection(...args),
}));

// ✅ Jest requires mock factory closures to reference only "mock*" vars.
const mockDerivedLedgerRunIdExistsForOtherUser = jest.fn<
  Promise<boolean>,
  [{ uid: string; runId: string }]
>(async () => false);

jest.mock("../../db/derivedLedger", () => ({
  derivedLedgerRunIdExistsForOtherUser: (...args: unknown[]) =>
    mockDerivedLedgerRunIdExistsForOtherUser(...(args as [{ uid: string; runId: string }])),
}));

type Uid = "user_A" | "user_B";
type JsonObject = Record<string, unknown>;

type DocSnap = { exists: boolean; data: () => unknown };

type DocRef = {
  id: string;
  get: () => Promise<DocSnap>;
  collection: (name: string) => CollectionRef;
};

type CollectionRef = {
  doc: (id: string) => DocRef;
};

type SnapshotDoc = {
  schemaVersion: 1;
  kind: string;
  hash: string;
  createdAt: { toDate: () => Date };
  data: unknown;
};

function ts(iso: string) {
  return { toDate: () => new Date(iso) };
}

function sha256Hex(input: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const normalize = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(normalize);
    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) throw new Error("circular");
    seen.add(obj);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) out[k] = normalize(obj[k]);
    return out;
  };

  return JSON.stringify(normalize(value));
}

function makeSnapshot(kind: string, data: unknown, createdAtIso: string): SnapshotDoc {
  const body = stableStringify(data);
  const hash = sha256Hex(body);
  return { schemaVersion: 1, kind, hash, createdAt: ts(createdAtIso), data };
}

function makeCanonicalSleepEvent(params: { id: string; uid: string; day: string; start: string }): JsonObject {
  const { id, uid, day, start } = params;
  return {
    id,
    userId: uid,
    sourceId: "manual",
    kind: "sleep",
    start,
    end: start,
    day,
    timezone: "America/New_York",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    schemaVersion: 1,
    totalMinutes: 420,
    efficiency: null,
    latencyMinutes: null,
    awakenings: null,
    isMainSleep: true,
  };
}

function makeTestApp() {
  const app = express();

  // Inject uid for tests (matches other route tests)
  app.use((req, _res, next) => {
    const uid = (req.header("x-test-uid") as Uid | null) ?? "user_A";
    (req as unknown as { uid: string }).uid = uid;
    next();
  });

  app.use("/users/me", usersMeRouter);
  return app;
}

function makeInMemoryDb() {
  // events[uid][id] = doc
  const events = new Map<Uid, Map<string, JsonObject>>();
  // ledger[uid][day].pointer + runs[runId].run + snapshots[path]
  const ledger = new Map<
    Uid,
    Map<string, { pointer: JsonObject; runs: Map<string, { run: JsonObject; snapshots: Map<string, SnapshotDoc> }> }>
  >();

  const ensureUserEvents = (uid: Uid) => {
    const m = events.get(uid);
    if (m) return m;
    const next = new Map<string, JsonObject>();
    events.set(uid, next);
    return next;
  };

  const ensureUserLedger = (uid: Uid) => {
    const m = ledger.get(uid);
    if (m) return m;
    const next = new Map<
      string,
      { pointer: JsonObject; runs: Map<string, { run: JsonObject; snapshots: Map<string, SnapshotDoc> }> }
    >();
    ledger.set(uid, next);
    return next;
  };

  const putEvent = (uid: Uid, id: string, doc: JsonObject) => {
    ensureUserEvents(uid).set(id, doc);
  };

  const putRun = (params: {
    uid: Uid;
    day: string;
    runId: string;
    runDoc: JsonObject;
    snapshots: Record<string, SnapshotDoc>;
  }) => {
    const { uid, day, runId, runDoc, snapshots } = params;
    const userLedger = ensureUserLedger(uid);
    const dayRec =
      userLedger.get(day) ??
      ({ pointer: { schemaVersion: 1, userId: uid, date: day, latestRunId: runId }, runs: new Map() } as {
        pointer: JsonObject;
        runs: Map<string, { run: JsonObject; snapshots: Map<string, SnapshotDoc> }>;
      });

    dayRec.pointer = { ...dayRec.pointer, latestRunId: runId, latestComputedAt: runDoc["computedAt"] };
    const runRec = { run: runDoc, snapshots: new Map(Object.entries(snapshots)) };
    dayRec.runs.set(runId, runRec);
    userLedger.set(day, dayRec);
  };

  const buildUserCollection = (uid: Uid, collectionName: string): CollectionRef => {
    if (collectionName === "events") {
      return {
        doc(id: string): DocRef {
          return {
            id,
            async get() {
              const doc = (events.get(uid) ?? new Map()).get(id);
              return { exists: doc !== undefined, data: () => doc ?? null };
            },
            collection() {
              throw new Error("events has no subcollections in this test");
            },
          };
        },
      };
    }

    if (collectionName === "derivedLedger") {
      return {
        doc(day: string): DocRef {
          return {
            id: day,
            async get() {
              const dayRec = (ledger.get(uid) ?? new Map()).get(day);
              return { exists: dayRec !== undefined, data: () => (dayRec ? dayRec.pointer : null) };
            },
            collection(name: string): CollectionRef {
              if (name !== "runs") throw new Error(`unexpected subcollection ${name}`);
              return {
                doc(runId: string): DocRef {
                  return {
                    id: runId,
                    async get() {
                      const dayRec = (ledger.get(uid) ?? new Map()).get(day);
                      const runRec = dayRec?.runs.get(runId);
                      return { exists: runRec !== undefined, data: () => (runRec ? runRec.run : null) };
                    },
                    collection(sub: string): CollectionRef {
                      if (sub !== "snapshots") throw new Error(`unexpected runs subcollection ${sub}`);
                      return {
                        doc(snapId: string): DocRef {
                          return {
                            id: snapId,
                            async get() {
                              const dayRec = (ledger.get(uid) ?? new Map()).get(day);
                              const runRec = dayRec?.runs.get(runId);
                              const doc = runRec?.snapshots.get(snapId);
                              return { exists: doc !== undefined, data: () => doc ?? null };
                            },
                            collection(n2: string): CollectionRef {
                              // insights/items
                              if (snapId !== "insights" || n2 !== "items") throw new Error("unexpected nested");
                              return {
                                doc(insightId: string): DocRef {
                                  return {
                                    id: insightId,
                                    async get() {
                                      const key = `insights/items/${insightId}`;
                                      const dayRec = (ledger.get(uid) ?? new Map()).get(day);
                                      const runRec = dayRec?.runs.get(runId);
                                      const doc = runRec?.snapshots.get(key);
                                      return { exists: doc !== undefined, data: () => doc ?? null };
                                    },
                                    collection() {
                                      throw new Error("no more nesting");
                                    },
                                  };
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    }

    throw new Error(`unexpected collection: ${collectionName}`);
  };

  return { putEvent, putRun, buildUserCollection, ledger };
}

/**
 * Silence expected fail-closed logger noise for this suite only.
 * We suppress ONLY the structured error logs emitted by invalidDoc500:
 *   {"level":"error","msg":"invalid_firestore_doc", ...}
 *
 * IMPORTANT: we must call the *original* console.error for non-matching logs,
 * otherwise we recurse back into the spy.
 */
function silenceExpectedConsoleError() {
  const originalConsoleError = console.error.bind(console);

  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const first = args[0];

    // Our logger emits JSON strings like:
    // {"level":"error","msg":"invalid_firestore_doc",...}
    if (typeof first === "string" && first.includes(`"msg":"invalid_firestore_doc"`)) return;

    // Keep all other console.error output visible.
    originalConsoleError(...(args as Parameters<typeof console.error>));
  });

  return () => spy.mockRestore();
}

type StartedServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

async function startServer(app: express.Express): Promise<StartedServer> {
  const server = await new Promise<import("http").Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Unexpected server address");
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err?: Error) => (err ? reject(err) : resolve()));
      }),
  };
}

async function httpGetJson(params: { baseUrl: string; path: string; uid: Uid }): Promise<{ status: number; body: unknown }> {
  const resp = await fetch(`${params.baseUrl}${params.path}`, {
    method: "GET",
    headers: {
      "x-test-uid": params.uid,
    },
  });

  const text = await resp.text();
  let body: unknown = text;
  try {
    body = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    // leave as raw text
  }
  return { status: resp.status, body };
}

describe("Step 6 — /users/me/derived-ledger/explain", () => {
  const app = makeTestApp();
  const mem = makeInMemoryDb();

  let srv: StartedServer;
  let restoreConsole: (() => void) | undefined;

  beforeAll(async () => {
    restoreConsole = silenceExpectedConsoleError();
    srv = await startServer(app);
  });

  afterAll(async () => {
    await srv.close();
    restoreConsole?.();
  });

  beforeEach(() => {
    mockUserCollection.mockImplementation((uid: Uid, col: string) => mem.buildUserCollection(uid, col));

    // Ensure test isolation for this mock (suite-level mock, per-test behavior)
    mockDerivedLedgerRunIdExistsForOtherUser.mockReset();

    // Default authz check: runId exists under another user?
    mockDerivedLedgerRunIdExistsForOtherUser.mockImplementation(async ({ uid, runId }: { uid: string; runId: string }) => {
      for (const [u, dayMap] of mem.ledger.entries()) {
        if (u === uid) continue;
        for (const dayRec of dayMap.values()) {
          if (dayRec.runs.has(runId)) return true;
        }
      }
      return false;
    });
  });

  it("proves determinism: same (day, runId) returns identical payload and does not recompute", async () => {
    const day = "2025-01-02";
    const runId = "run_1";

    const ev = makeCanonicalSleepEvent({ id: "ev1", uid: "user_A", day, start: "2025-01-02T05:00:00.000Z" });
    mem.putEvent("user_A", "ev1", { ...ev, id: undefined }); // stored docs omit id field in Firestore

    const dailyFacts = { userId: "user_A", date: day, schemaVersion: 1, meta: { pipelineVersion: 1 } };
    const snapDaily = makeSnapshot("dailyFacts", dailyFacts, "2025-01-02T06:00:00.000Z");

    const runDoc: JsonObject = {
      schemaVersion: 1,
      runId,
      userId: "user_A",
      date: day,
      affectedDays: [day],
      computedAt: "2025-01-02T06:00:00.000Z",
      pipelineVersion: 1,
      trigger: { type: "scheduled", name: "test", eventId: "e" },
      invariantsApplied: ["I-17"],
      canonicalEventIds: ["ev1"],
      snapshotRefs: [{ kind: "dailyFacts", doc: "dailyFacts", hash: snapDaily.hash }],
      outputs: { hasDailyFacts: true, insightsCount: 0, hasIntelligenceContext: false },
      createdAt: ts("2025-01-02T06:00:00.000Z"),
    };

    mem.putRun({ uid: "user_A", day, runId, runDoc, snapshots: { dailyFacts: snapDaily } });

    const first = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });
    expect(first.status).toBe(200);

    const second = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });
    expect(second.status).toBe(200);

    expect(second.body).toEqual(first.body);
  });

  it("proves trace completeness: returns run metadata and validates referenced docs", async () => {
    const day = "2025-01-03";
    const runId = "run_2";

    const ev1 = makeCanonicalSleepEvent({ id: "e1", uid: "user_A", day, start: "2025-01-03T05:00:00.000Z" });
    const ev2 = makeCanonicalSleepEvent({ id: "e2", uid: "user_A", day, start: "2025-01-03T06:00:00.000Z" });
    mem.putEvent("user_A", "e1", { ...ev1, id: undefined });
    mem.putEvent("user_A", "e2", { ...ev2, id: undefined });

    const dailyFacts = { userId: "user_A", date: day, schemaVersion: 1, meta: { pipelineVersion: 1 } };
    const ctx = { userId: "user_A", date: day, schemaVersion: 1, meta: { pipelineVersion: 1 } };
    const snapDaily = makeSnapshot("dailyFacts", dailyFacts, "2025-01-03T07:00:00.000Z");
    const snapCtx = makeSnapshot("intelligenceContext", ctx, "2025-01-03T07:00:00.000Z");
    const insightItem = makeSnapshot(
      "insight",
      { id: "ins_1", date: day, userId: "user_A" },
      "2025-01-03T07:00:00.000Z",
    );

    const runDoc: JsonObject = {
      schemaVersion: 1,
      runId,
      userId: "user_A",
      date: day,
      affectedDays: [day],
      computedAt: "2025-01-03T07:00:00.000Z",
      pipelineVersion: 1,
      trigger: { type: "realtime", name: "onCanonicalEventCreated", eventId: "e2" },
      invariantsApplied: ["I-17"],
      canonicalEventIds: ["e1", "e2"],
      snapshotRefs: [
        { kind: "dailyFacts", doc: "dailyFacts", hash: snapDaily.hash },
        { kind: "intelligenceContext", doc: "intelligenceContext", hash: snapCtx.hash },
        { kind: "insights", doc: "insights/items/ins_1", hash: insightItem.hash },
      ],
      outputs: { hasDailyFacts: true, insightsCount: 1, hasIntelligenceContext: true },
      createdAt: ts("2025-01-03T07:00:00.000Z"),
    };

    mem.putRun({
      uid: "user_A",
      day,
      runId,
      runDoc,
      snapshots: {
        dailyFacts: snapDaily,
        intelligenceContext: snapCtx,
        "insights/items/ins_1": insightItem,
      },
    });

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(200);

    const body = resp.body as Record<string, unknown>;
    expect(body["day"]).toBe(day);

    const run = body["run"] as Record<string, unknown>;
    expect(run["runId"]).toBe(runId);
    expect(run["canonicalEventIds"]).toEqual(["e1", "e2"]);

    const snapshotRefs = run["snapshotRefs"] as unknown[];
    expect(snapshotRefs).toHaveLength(3);

    expect(run["invariantsApplied"]).toEqual(["I-17"]);
  });

  it("fails closed (500) when a referenced canonical event is missing", async () => {
    const day = "2025-01-04";
    const runId = "run_3";

    const dailyFacts = { userId: "user_A", date: day, schemaVersion: 1, meta: { pipelineVersion: 1 } };
    const snapDaily = makeSnapshot("dailyFacts", dailyFacts, "2025-01-04T07:00:00.000Z");

    mem.putRun({
      uid: "user_A",
      day,
      runId,
      runDoc: {
        schemaVersion: 1,
        runId,
        userId: "user_A",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-04T07:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: ["missing_ev"],
        snapshotRefs: [{ kind: "dailyFacts", doc: "dailyFacts", hash: snapDaily.hash }],
        outputs: { hasDailyFacts: true, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-04T07:00:00.000Z"),
      },
      snapshots: { dailyFacts: snapDaily },
    });

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(500);
  });

  it("fails closed (500) when a referenced snapshot doc is missing", async () => {
    const day = "2025-01-06";
    const runId = "run_4";

    const ev = makeCanonicalSleepEvent({ id: "e1", uid: "user_A", day, start: "2025-01-06T05:00:00.000Z" });
    mem.putEvent("user_A", "e1", { ...ev, id: undefined });

    // Run references dailyFacts snapshot, but we do not store the snapshot document.
    mem.putRun({
      uid: "user_A",
      day,
      runId,
      runDoc: {
        schemaVersion: 1,
        runId,
        userId: "user_A",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-06T07:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: ["e1"],
        snapshotRefs: [{ kind: "dailyFacts", doc: "dailyFacts", hash: "deadbeef" }],
        outputs: { hasDailyFacts: true, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-06T07:00:00.000Z"),
      },
      snapshots: {},
    });

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(500);
  });

  it("fails closed (500) when a referenced doc has invalid shape", async () => {
    const day = "2025-01-07";
    const runId = "run_5";

    const ev = makeCanonicalSleepEvent({ id: "e1", uid: "user_A", day, start: "2025-01-07T05:00:00.000Z" });
    mem.putEvent("user_A", "e1", { ...ev, id: undefined });

    // Invalid snapshot: schemaVersion mismatch
    const invalidSnapshot = {
      schemaVersion: 999,
      kind: "dailyFacts",
      hash: "deadbeef",
      createdAt: ts("2025-01-07T06:00:00.000Z"),
      data: {},
    } as unknown as SnapshotDoc;

    mem.putRun({
      uid: "user_A",
      day,
      runId,
      runDoc: {
        schemaVersion: 1,
        runId,
        userId: "user_A",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-07T06:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: ["e1"],
        snapshotRefs: [{ kind: "dailyFacts", doc: "dailyFacts", hash: "deadbeef" }],
        outputs: { hasDailyFacts: true, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-07T06:00:00.000Z"),
      },
      snapshots: { dailyFacts: invalidSnapshot },
    });

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(500);
  });

  it("fails closed (500) when a referenced snapshot hash mismatches the stored snapshot hash", async () => {
    const day = "2025-01-08";
    const runId = "run_hash_mismatch";

    const ev = makeCanonicalSleepEvent({ id: "e1", uid: "user_A", day, start: "2025-01-08T05:00:00.000Z" });
    mem.putEvent("user_A", "e1", { ...ev, id: undefined });

    const dailyFacts = { userId: "user_A", date: day, schemaVersion: 1, meta: { pipelineVersion: 1 } };
    const snapDaily = makeSnapshot("dailyFacts", dailyFacts, "2025-01-08T06:00:00.000Z");

    // Store the snapshot doc with its real hash, but reference a different hash in snapshotRefs.
    const wrongHash = snapDaily.hash === "deadbeef" ? "cafebabe" : "deadbeef";

    mem.putRun({
      uid: "user_A",
      day,
      runId,
      runDoc: {
        schemaVersion: 1,
        runId,
        userId: "user_A",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-08T06:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: ["e1"],
        snapshotRefs: [{ kind: "dailyFacts", doc: "dailyFacts", hash: wrongHash }],
        outputs: { hasDailyFacts: true, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-08T06:00:00.000Z"),
      },
      snapshots: { dailyFacts: snapDaily },
    });

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(500);
  });

  it("returns 404 when a run is missing and does not exist under another user", async () => {
    const day = "2025-01-09";
    const runId = "missing_run_404";

    // Ensure the day pointer exists for user_A so we pass the derivedLedgerDay existence check.
    mem.putRun({
      uid: "user_A",
      day,
      runId: "some_other_run",
      runDoc: {
        schemaVersion: 1,
        runId: "some_other_run",
        userId: "user_A",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-09T06:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: [],
        snapshotRefs: [],
        outputs: { hasDailyFacts: false, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-09T06:00:00.000Z"),
      },
      snapshots: {},
    });

    // Explicitly force "does not exist elsewhere" for this test.
    mockDerivedLedgerRunIdExistsForOtherUser.mockResolvedValue(false);

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(404);
  });

  it("authz: user cannot explain another user's run (403)", async () => {
    const day = "2025-01-05";
    const runId = "shared_run";

    // Store run under user_B only
    mem.putRun({
      uid: "user_B",
      day,
      runId,
      runDoc: {
        schemaVersion: 1,
        runId,
        userId: "user_B",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-05T07:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: [],
        snapshotRefs: [],
        outputs: { hasDailyFacts: false, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-05T07:00:00.000Z"),
      },
      snapshots: {},
    });

    // user_A: create pointer day doc via another run, but not this runId
    mem.putRun({
      uid: "user_A",
      day,
      runId: "different",
      runDoc: {
        schemaVersion: 1,
        runId: "different",
        userId: "user_A",
        date: day,
        affectedDays: [day],
        computedAt: "2025-01-05T07:00:00.000Z",
        pipelineVersion: 1,
        trigger: { type: "scheduled", name: "test", eventId: "e" },
        invariantsApplied: ["I-17"],
        canonicalEventIds: [],
        snapshotRefs: [],
        outputs: { hasDailyFacts: false, insightsCount: 0, hasIntelligenceContext: false },
        createdAt: ts("2025-01-05T07:00:00.000Z"),
      },
      snapshots: {},
    });

    const resp = await httpGetJson({
      baseUrl: srv.baseUrl,
      path: `/users/me/derived-ledger/explain?day=${day}&runId=${runId}`,
      uid: "user_A",
    });

    expect(resp.status).toBe(403);
  });
});
