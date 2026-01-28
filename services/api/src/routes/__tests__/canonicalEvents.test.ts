// services/api/src/routes/__tests__/canonicalEvents.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeEventsRoutes from "../usersMe.events";
import { db, userCollection } from "../../db";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  db: {
    collectionGroup: jest.fn(),
  },
}));

type Uid = "user_A" | "user_B";

type DocData = Record<string, unknown>;

type DocSnap = {
  exists: boolean;
  data: () => unknown;
};

type DocRef = {
  get: () => Promise<DocSnap>;
};

type QuerySnap = {
  size: number;
  docs: { id: string; data: () => unknown; ref: { path: string } }[];
};

type QueryRef = {
  where: (field: string, op: string, value: unknown) => QueryRef;
  orderBy: (field: string, dir: "asc" | "desc") => QueryRef;
  limit: (n: number) => QueryRef;
  startAfter: (start: string, id: string) => QueryRef;
  get: () => Promise<QuerySnap>;
};

type CollectionRef = {
  doc: (id: string) => DocRef;
  where: QueryRef["where"];
  orderBy: QueryRef["orderBy"];
  limit: QueryRef["limit"];
  startAfter: QueryRef["startAfter"];
  get: QueryRef["get"];
};

type CollectionGroupRef = {
  where: (field: string, op: string, value: unknown) => CollectionGroupRef;
  limit: (n: number) => CollectionGroupRef;
  get: () => Promise<QuerySnap>;
};

function canonicalSleepEvent(params: { id: string; uid: string; day: string; start: string }): DocData {
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

describe("Canonical Truth Read Surface — /users/me/events", () => {
  let server: http.Server;
  let baseUrl: string;

  // In-memory canonical store: users/{uid}/events/{id} -> DocData
  const store: Record<string, Record<string, DocData>> = Object.create(null);

  const withUid = () => {
    return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      const uid = (req.header("x-test-uid") as Uid | null) ?? "user_A";
      (req as unknown as { uid: string }).uid = uid;
      next();
    };
  };

  function put(uid: string, id: string, data: DocData) {
    store[uid] ??= Object.create(null);
    store[uid][id] = data;
  }

  function resetStore() {
    for (const k of Object.keys(store)) delete store[k];
  }

  function makeUserEventsQuery(uid: string): QueryRef {
    let whereDay: string | null = null;
    const orderBys: { field: string; dir: "asc" | "desc" }[] = [];
    let lim: number | null = null;
    let after: { start: string; id: string } | null = null;

    const api: QueryRef = {
      where(field, op, value) {
        if (field === "day" && op === "==" && typeof value === "string") {
          whereDay = value;
        }
        return api;
      },
      orderBy(field, dir) {
        orderBys.push({ field, dir });
        return api;
      },
      limit(n) {
        lim = n;
        return api;
      },
      startAfter(start, id) {
        after = { start, id };
        return api;
      },
      async get() {
        const userDocs = store[uid] ?? Object.create(null);

        // Filter by day
        let rows = Object.entries(userDocs)
          .map(([id, data]) => ({ id, data }))
          .filter((r) => {
            if (!whereDay) return true;
            return r.data["day"] === whereDay;
          });

        // Deterministic ordering required by endpoint:
        // primary: start asc, secondary: __name__ (id) asc
        rows.sort((a, b) => {
          const aStart = typeof a.data["start"] === "string" ? (a.data["start"] as string) : "";
          const bStart = typeof b.data["start"] === "string" ? (b.data["start"] as string) : "";
          if (aStart < bStart) return -1;
          if (aStart > bStart) return 1;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });

        // Apply cursor
        if (after) {
          rows = rows.filter((r) => {
            const rStart = typeof r.data["start"] === "string" ? (r.data["start"] as string) : "";
            if (rStart > after.start) return true;
            if (rStart < after.start) return false;
            return r.id > after.id;
          });
        }

        // Apply limit
        const take = lim ?? rows.length;
        const page = rows.slice(0, take).map((r) => ({
          id: r.id,
          data: () => r.data,
          ref: { path: `users/${uid}/events/${r.id}` },
        }));

        return {
          size: page.length,
          docs: page,
        };
      },
    };

    // keep variable used to avoid no-unused-vars if rules tighten later
    void orderBys;

    return api;
  }

  function makeUserCollection(uid: string): CollectionRef {
    const q = makeUserEventsQuery(uid);

    return {
      doc(id: string) {
        return {
          async get() {
            const userDocs = store[uid] ?? Object.create(null);
            const doc = userDocs[id];
            return {
              exists: doc !== undefined,
              data: () => doc ?? null,
            };
          },
        };
      },
      where: q.where,
      orderBy: q.orderBy,
      limit: q.limit,
      startAfter: q.startAfter,
      get: q.get,
    };
  }

  function makeCollectionGroupQuery(eventId: string, limitN: number): QuerySnap {
    const hits: { uid: string; id: string; data: DocData }[] = [];

    for (const [uid, docs] of Object.entries(store)) {
      const doc = docs[eventId];
      if (doc) hits.push({ uid, id: eventId, data: doc });
      if (hits.length >= limitN) break;
    }

    return {
      size: hits.length,
      docs: hits.map((h) => ({
        id: h.id,
        data: () => h.data,
        ref: { path: `users/${h.uid}/events/${h.id}` },
      })),
    };
  }

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(withUid());
    app.use("/users/me", usersMeEventsRoutes);

    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    resetStore();
    jest.resetAllMocks();

    // Silence expected error logs from fail-closed validation tests
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    // userCollection(uid, "events") mocked
    (userCollection as jest.Mock).mockImplementation((uid: string, name: string) => {
      if (name !== "events") throw new Error(`Unexpected collection name: ${name}`);
      return makeUserCollection(uid);
    });

    // db.collectionGroup("events") mocked
    (db.collectionGroup as jest.Mock).mockImplementation((name: string) => {
      if (name !== "events") throw new Error(`Unexpected collectionGroup name: ${name}`);

      let whereField: string | null = null;
      let whereValue: unknown = null;
      let lim = 1;

      const cg: CollectionGroupRef = {
        where(field, _op, value) {
          whereField = field;
          whereValue = value;
          return cg;
        },
        limit(n) {
          lim = n;
          return cg;
        },
        async get() {
          // We only support the query used by getCanonicalEventById:
          // where("__name__", "==", id).limit(2)
          if (whereField !== "__name__" || typeof whereValue !== "string") {
            return { size: 0, docs: [] };
          }
          return makeCollectionGroupQuery(whereValue, lim);
        },
      };

      return cg;
    });
  });

  test("list-by-day: returns only events whose day == requested day; sorted deterministically; stable pagination", async () => {
    const day = "2025-01-01";

    put("user_A", "a", canonicalSleepEvent({ id: "a", uid: "user_A", day, start: "2025-01-01T01:00:00.000Z" }));
    put("user_A", "b", canonicalSleepEvent({ id: "b", uid: "user_A", day, start: "2025-01-01T02:00:00.000Z" }));
    put("user_A", "aa", canonicalSleepEvent({ id: "aa", uid: "user_A", day, start: "2025-01-01T02:00:00.000Z" }));
    put(
      "user_A",
      "zzz",
      canonicalSleepEvent({ id: "zzz", uid: "user_A", day: "2025-01-02", start: "2025-01-02T01:00:00.000Z" }),
    );

    const r1 = await fetch(`${baseUrl}/users/me/events?day=${day}&limit=2`, {
      headers: { "x-test-uid": "user_A" },
    });

    expect(r1.status).toBe(200);
    const j1 = (await r1.json()) as {
      items: { id: string; start: string; day: string }[];
      page: { hasMore: boolean; nextCursor: string | null };
      meta: { requestedDay: string; complete: boolean };
    };

    expect(new Set(j1.items.map((x) => x.day))).toEqual(new Set([day]));
    expect(j1.items.map((x) => x.id)).toEqual(["a", "aa"]);
    expect(j1.page.hasMore).toBe(true);
    expect(j1.page.nextCursor).toBeTruthy();
    expect(j1.meta.requestedDay).toBe(day);
    expect(j1.meta.complete).toBe(false);

    const r2 = await fetch(
      `${baseUrl}/users/me/events?day=${day}&limit=2&cursor=${encodeURIComponent(j1.page.nextCursor!)}`,
      { headers: { "x-test-uid": "user_A" } },
    );

    expect(r2.status).toBe(200);
    const j2 = (await r2.json()) as {
      items: { id: string }[];
      page: { hasMore: boolean; nextCursor: string | null };
      meta: { complete: boolean };
    };

    expect(j2.items.map((x) => x.id)).toEqual(["b"]);
    expect(j2.page.hasMore).toBe(false);
    expect(j2.page.nextCursor).toBeNull();
    expect(j2.meta.complete).toBe(true);

    const r1b = await fetch(`${baseUrl}/users/me/events?day=${day}&limit=2`, {
      headers: { "x-test-uid": "user_A" },
    });

    expect(r1b.status).toBe(200);
    const j1b = (await r1b.json()) as typeof j1;

    expect(j1b.items.map((x) => x.id)).toEqual(j1.items.map((x) => x.id));
    expect(j1b.page.nextCursor).toEqual(j1.page.nextCursor);
  });

  test("get-by-id: valid id returns validated DTO; invalid doc shape fails closed (500)", async () => {
    const day = "2025-01-01";

    put(
      "user_A",
      "good_1",
      canonicalSleepEvent({ id: "good_1", uid: "user_A", day, start: "2025-01-01T01:00:00.000Z" }),
    );

    const rGood = await fetch(`${baseUrl}/users/me/events/good_1`, { headers: { "x-test-uid": "user_A" } });
    expect(rGood.status).toBe(200);
    const jGood = (await rGood.json()) as { id: string; userId: string; kind: string };
    expect(jGood).toMatchObject({ id: "good_1", userId: "user_A", kind: "sleep" });

    const bad = canonicalSleepEvent({ id: "bad_1", uid: "user_A", day, start: "2025-01-01T02:00:00.000Z" });
    delete bad["start"];
    put("user_A", "bad_1", bad);

    const rBad = await fetch(`${baseUrl}/users/me/events/bad_1`, { headers: { "x-test-uid": "user_A" } });
    expect(rBad.status).toBe(500);
    const jBad = (await rBad.json()) as { ok: boolean; error: { code: string } };
    expect(jBad.ok).toBe(false);
    expect(jBad.error.code).toBe("CANONICAL_VALIDATION_FAILED");
  });

  test("validation enforcement: list-by-day fails closed if ANY doc is malformed (500), no silent drops", async () => {
    const day = "2025-01-01";

    const good = canonicalSleepEvent({ id: "ok_1", uid: "user_A", day, start: "2025-01-01T01:00:00.000Z" });
    put("user_A", "ok_1", good);

    const bad = canonicalSleepEvent({ id: "bad_2", uid: "user_A", day, start: "2025-01-01T02:00:00.000Z" });
    delete bad["timezone"];
    put("user_A", "bad_2", bad);

    const r = await fetch(`${baseUrl}/users/me/events?day=${day}&limit=50`, { headers: { "x-test-uid": "user_A" } });
    expect(r.status).toBe(500);
    const j = (await r.json()) as { ok: boolean; error: { code: string } };
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe("CANONICAL_VALIDATION_FAILED");
  });

  test("authz invariants: User A cannot read User B’s canonical event by id (403 forbidden)", async () => {
    const day = "2025-01-01";
    put(
      "user_B",
      "b_only",
      canonicalSleepEvent({ id: "b_only", uid: "user_B", day, start: "2025-01-01T01:00:00.000Z" }),
    );

    const r = await fetch(`${baseUrl}/users/me/events/b_only`, { headers: { "x-test-uid": "user_A" } });
    expect(r.status).toBe(403);

    const j = (await r.json()) as { ok: boolean; error: { code: string } };
    expect(j.ok).toBe(false);
    expect(j.error.code).toBe("FORBIDDEN");
  });
});