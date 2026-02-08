/**
 * Sprint 2 — Client Trust Layer tests.
 * Proves: valid payload → ready; invalid payload → error (fail-closed) with kind:"contract"
 */
import { apiGetZodAuthed, apiPostZodAuthed } from "../validate";
import { dailyFactsDtoSchema, logWeightResponseDtoSchema } from "@oli/contracts";

const originalFetch = global.fetch;
const originalEnv = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL = "https://api.test.example";
});

afterEach(() => {
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL = originalEnv;
  global.fetch = originalFetch;
});

describe("apiGetZodAuthed", () => {
  it("returns ApiOk with parsed DTO when response is valid", async () => {
    const validDailyFacts = {
      schemaVersion: 1,
      userId: "user_1",
      date: "2025-01-15",
      computedAt: "2025-01-15T12:00:00.000Z",
      sleep: { totalMinutes: 420 },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "req_1" }),
      text: () => Promise.resolve(JSON.stringify(validDailyFacts)),
    });

    const res = await apiGetZodAuthed("/users/me/daily-facts?day=2025-01-15", "token", dailyFactsDtoSchema);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.json).toEqual(validDailyFacts);
      expect(res.status).toBe(200);
    }
  });

  it("returns ApiFailure kind:contract when response shape is invalid", async () => {
    const invalidBody = {
      schemaVersion: 2, // wrong version
      userId: "user_1",
      // missing required: date, computedAt
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "req_2" }),
      text: () => Promise.resolve(JSON.stringify(invalidBody)),
    });

    const res = await apiGetZodAuthed("/users/me/daily-facts?day=2025-01-15", "token", dailyFactsDtoSchema);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.kind).toBe("contract");
      expect(res.error).toBe("Invalid response shape");
      expect(res.json).toBeDefined();
      expect(Array.isArray((res.json as { issues?: unknown[] })?.issues)).toBe(true);
    }
  });

  it("returns Http failure unchanged when res.ok is false", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "x-request-id": "req_3" }),
      text: () => Promise.resolve(JSON.stringify({ ok: false, error: "Not found" })),
    });

    const res = await apiGetZodAuthed("/users/me/daily-facts?day=2025-01-15", "token", dailyFactsDtoSchema);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.kind).toBe("http");
      expect(res.status).toBe(404);
    }
  });
});

describe("apiPostZodAuthed", () => {
  it("returns ApiFailure kind:contract when POST response shape is invalid", async () => {
    const invalidBody = { ok: true, rawEventId: "evt_1" }; // missing day for logWeightResponseDtoSchema

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: new Headers({ "x-request-id": "req_4" }),
      text: () => Promise.resolve(JSON.stringify(invalidBody)),
    });

    const res = await apiPostZodAuthed("/ingest", { payload: {} }, "token", logWeightResponseDtoSchema);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.kind).toBe("contract");
      expect(res.error).toBe("Invalid response shape");
    }
  });
});
