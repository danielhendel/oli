// services/api/src/routes/__tests__/rawEvents.list.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

// IMPORTANT:
// Mock modules that would otherwise import firebase-admin (and trigger ESM uuid parsing issues)
// BEFORE importing the router under test.

jest.mock("../../db", () => ({
  // usersMe.ts imports userCollection from "../db"
  // Step 3 list endpoints do not use it, but we must stub it to prevent firebase-admin from loading.
  userCollection: jest.fn(() => {
    throw new Error("userCollection should not be called in rawEvents.list.test.ts");
  }),
}));

jest.mock("../../db/rawEvents", () => ({
  listRawEventsByObservedAtRange: jest.fn(),
}));

import { listRawEventsByObservedAtRange } from "../../db/rawEvents";

// Import AFTER mocks are declared
import usersMeRoutes from "../usersMe";

type ListResult = {
  docs: { id: string; data: unknown }[];
  hasMore: boolean;
};

describe("RawEvent list endpoints (Step 3)", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: "1mb" }));

    // Inject authenticated uid (bypass auth middleware for this unit test)
    app.use((req, _res, next) => {
      (req as unknown as { uid: string }).uid = "user_123";
      next();
    });

    app.use("/users/me", usersMeRoutes);

    server = app.listen(0);
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    /**
     * Critical: clearAllMocks() does NOT clear queued mockResolvedValueOnce() behavior.
     * We must fully reset the mocked function so each test is isolated and deterministic.
     */
    (listRawEventsByObservedAtRange as jest.Mock).mockReset();
  });

  test("GET /users/me/rawEvents?day=... returns deterministically sorted items with stable cursor pagination", async () => {
    (listRawEventsByObservedAtRange as jest.Mock).mockResolvedValueOnce({
      docs: [
        {
          id: "b",
          data: {
            id: "b",
            userId: "user_123",
            sourceId: "manual",
            provider: "manual",
            sourceType: "manual",
            kind: "workout",
            observedAt: "2025-01-02T00:00:00.000Z",
            receivedAt: "2025-01-02T00:00:01.000Z",
            payload: { shouldNot: "leak" },
            schemaVersion: 1,
          },
        },
        {
          id: "a",
          data: {
            id: "a",
            userId: "user_123",
            sourceId: "manual",
            provider: "manual",
            sourceType: "manual",
            kind: "workout",
            observedAt: "2025-01-01T00:00:00.000Z",
            receivedAt: "2025-01-01T00:00:01.000Z",
            payload: { shouldNot: "leak" },
            schemaVersion: 1,
          },
        },
      ],
      hasMore: true,
    } satisfies ListResult);

    const res = await fetch(`${baseUrl}/users/me/rawEvents?day=2025-01-01&limit=2`);
    expect(res.status).toBe(200);
    const json = await res.json();

    // Deterministic ordering (observedAt, then id)
    expect(json.items.map((x: { id: string }) => x.id)).toEqual(["a", "b"]);

    // Summary-only (no payload)
    expect(json.items[0]).not.toHaveProperty("payload");
    expect(json.items[1]).not.toHaveProperty("payload");

    // Cursor present because hasMore=true
    expect(typeof json.nextCursor).toBe("string");
    expect(json.nextCursor.length).toBeGreaterThan(0);

    // Next call uses cursor
    (listRawEventsByObservedAtRange as jest.Mock).mockResolvedValueOnce({
      docs: [
        {
          id: "c",
          data: {
            id: "c",
            userId: "user_123",
            sourceId: "manual",
            provider: "manual",
            sourceType: "manual",
            kind: "workout",
            observedAt: "2025-01-03T00:00:00.000Z",
            receivedAt: "2025-01-03T00:00:01.000Z",
            payload: { shouldNot: "leak" },
            schemaVersion: 1,
          },
        },
      ],
      hasMore: false,
    } satisfies ListResult);

    const res2 = await fetch(
      `${baseUrl}/users/me/rawEvents?day=2025-01-01&limit=2&cursor=${encodeURIComponent(json.nextCursor)}`,
    );
    expect(res2.status).toBe(200);
    const json2 = await res2.json();

    expect(json2.items.map((x: { id: string }) => x.id)).toEqual(["c"]);
    expect(json2.nextCursor).toBeNull();

    expect(listRawEventsByObservedAtRange).toHaveBeenCalledTimes(2);
    const secondCallArgs = (listRawEventsByObservedAtRange as jest.Mock).mock.calls[1][0] as Record<string, unknown>;
    expect(secondCallArgs.cursor).toBeDefined();
  });

  test("Filtering correctness: kind/provider/sourceId are passed through; upload safety enforced", async () => {
    (listRawEventsByObservedAtRange as jest.Mock).mockResolvedValueOnce({
      docs: [
        {
          id: "file_1",
          data: {
            id: "file_1",
            userId: "user_123",
            sourceId: "upload",
            provider: "manual",
            sourceType: "manual",
            kind: "file",
            observedAt: "2025-01-02T00:00:00.000Z",
            receivedAt: "2025-01-02T00:00:00.000Z",
            payload: {
              storageBucket: "bucket_1",
              storagePath: "uploads/user_123/sha256/test.pdf",
              sha256: "abc",
              mimeType: "application/pdf",
              originalFilename: "test.pdf",
              sizeBytes: 123,
              signedUrl: "SHOULD_NOT_LEAK",
              fileBase64: "SHOULD_NOT_LEAK",
              token: "SHOULD_NOT_LEAK",
            },
            schemaVersion: 1,
          },
        },
      ],
      hasMore: false,
    } satisfies ListResult);

    const res = await fetch(
      `${baseUrl}/users/me/rawEvents/range?start=2025-01-01&end=2025-01-31&kind=file&provider=manual&sourceId=upload&limit=10`,
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(listRawEventsByObservedAtRange).toHaveBeenCalledTimes(1);
    const callArgs = (listRawEventsByObservedAtRange as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.filters).toEqual({ kind: "file", provider: "manual", sourceId: "upload" });

    // Upload-safe surface
    expect(json.items).toHaveLength(1);
    const item = json.items[0] as Record<string, unknown>;

    expect(item.kind).toBe("file");
    expect(item).toHaveProperty("upload");
    expect(item).not.toHaveProperty("payload");

    // No secrets
    const s = JSON.stringify(item);
    expect(s).not.toContain("signedUrl");
    expect(s).not.toContain("fileBase64");
    expect(s).not.toContain("token");
    expect(s).not.toContain("storageBucket");
  });

  test("Fail-closed validation: malformed raw event doc causes API to return 500 (no partial success)", async () => {
    // This test intentionally triggers invalidDoc500(), which logs at error level.
    // Suppress console.error only for this test to keep Jest output clean.
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {
      void 0;
    });

    try {
      (listRawEventsByObservedAtRange as jest.Mock).mockResolvedValueOnce({
        docs: [
          {
            id: "bad_1",
            data: {
              id: "bad_1",
              userId: "user_123",
              sourceId: "manual",
              provider: "manual",
              sourceType: "manual",
              kind: "workout",
              // missing observedAt + receivedAt => should fail DTO validation => 500
            },
          },
        ],
        hasMore: false,
      } satisfies ListResult);

      const res = await fetch(`${baseUrl}/users/me/rawEvents?day=2025-01-01`);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json).toMatchObject({ ok: false, error: { code: "INVALID_DOC" } });
    } finally {
      errSpy.mockRestore();
    }
  });

  test("Invalid filters fail closed (400)", async () => {
    const res = await fetch(`${baseUrl}/users/me/rawEvents?day=2025-01-01&unknownFilter=x`);
    expect(res.status).toBe(400);
  });
});