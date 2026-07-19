// services/api/src/routes/__tests__/timeline-feed.test.ts
import express from "express";
import type http from "http";
import { AddressInfo } from "net";

import usersMeRoutes from "../usersMe";
import { assembleTimelineFeedPage } from "../../lib/timeline/assembleFeedPage";

jest.mock("../../db", () => ({
  userCollection: jest.fn(),
  documentIdPath: { _: "documentId" },
}));

jest.mock("../../lib/timeline/assembleFeedPage", () => ({
  assembleTimelineFeedPage: jest.fn(),
}));

const mockAssemble = assembleTimelineFeedPage as jest.MockedFunction<
  typeof assembleTimelineFeedPage
>;

describe("GET /users/me/timeline-feed", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
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
    jest.resetAllMocks();
  });

  test("returns 200 with items, sections, nextCursor, hasMore", async () => {
    mockAssemble.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: "sleep_context:2026-07-16",
            kind: "sleep_context",
            day: "2026-07-16",
            occurredAt: "2026-07-16T00:00:00.000Z",
            timezone: "UTC",
            title: "Sleep",
            status: "missing",
            source: "unknown",
            destination: "/(app)/recovery/sleep?day=2026-07-16",
            accessibilityLabel: "Sleep, No sleep data",
            dedupeKey: "sleep_context:2026-07-16",
            isSynthetic: true,
            displayRole: "day_context",
          },
        ],
        sections: ["2026-07-16"],
        nextCursor: null,
        hasMore: false,
      },
    });

    const res = await fetch(`${baseUrl}/users/me/timeline-feed?anchorDay=2026-07-16&limit=50`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sections).toEqual(["2026-07-16"]);
    expect(json.items).toHaveLength(1);
    expect(json.hasMore).toBe(false);
    expect(mockAssemble).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user_123",
        anchorDay: "2026-07-16",
        limit: 50,
      }),
    );
  });

  test("invalid query fails with 400", async () => {
    const res = await fetch(`${baseUrl}/users/me/timeline-feed?limit=0`);
    expect(res.status).toBe(400);
    expect(mockAssemble).not.toHaveBeenCalled();
  });

  test("invalid cursor fails with 400", async () => {
    mockAssemble.mockResolvedValue({
      ok: false,
      code: "INVALID_CURSOR",
      message: "Invalid cursor",
    });
    const res = await fetch(`${baseUrl}/users/me/timeline-feed?cursor=bad`);
    expect(res.status).toBe(400);
  });

  test("does not accept caller uid query param as authority", async () => {
    mockAssemble.mockResolvedValue({
      ok: true,
      data: { items: [], sections: [], nextCursor: null, hasMore: false },
    });
    const res = await fetch(
      `${baseUrl}/users/me/timeline-feed?anchorDay=2026-07-16&uid=other_user`,
    );
    // Extra query keys are stripped by schema (.strip); auth uid still used.
    expect(res.status).toBe(200);
    expect(mockAssemble).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "user_123" }),
    );
  });
});
