import { defaultUserProfileMain } from "@oli/contracts";

import { getUserProfileMain } from "../profileMain";

const originalFetch = global.fetch;
const originalEnv = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL = "https://api.test.example";
});

afterEach(() => {
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL = originalEnv;
  global.fetch = originalFetch;
});

describe("getUserProfileMain", () => {
  it("returns null when server responds 200 with JSON null (no profile doc yet)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "r1" }),
      text: () => Promise.resolve("null"),
    });

    const res = await getUserProfileMain("token");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.json).toBeNull();
    }
  });

  it("returns parsed profile when server responds with a full document", async () => {
    const doc = defaultUserProfileMain();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "x-request-id": "r1" }),
      text: () => Promise.resolve(JSON.stringify(doc)),
    });

    const res = await getUserProfileMain("token");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.json).toEqual(doc);
    }
  });

  it("surfaces HTTP 404 as failure (no implicit empty profile)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "x-request-id": "r1" }),
      text: () => Promise.resolve(JSON.stringify({ message: "Not found" })),
    });

    const res = await getUserProfileMain("token");
    expect(res.ok).toBe(false);
  });
});
