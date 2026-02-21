/**
 * Unit tests for http layer: 403/401 with HTML body returns human-friendly message.
 */
import { apiGetJsonAuthed } from "../http";

const originalFetch = global.fetch;
const originalEnv = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL = "https://api.test.example";
});

afterEach(() => {
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL = originalEnv;
  global.fetch = originalFetch;
});

describe("apiGetJsonAuthed 403/401 HTML handling", () => {
  it("returns friendly message for 403 with HTML body (e.g. gateway error page)", async () => {
    const htmlBody = "<!DOCTYPE html><html><body>Forbidden</body></html>";

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "x-request-id": "req_403" }),
      text: () => Promise.resolve(htmlBody),
    });

    const res = await apiGetJsonAuthed("/users/me/timeline?start=2025-01-01&end=2025-01-02", "token");

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(403);
      expect(res.kind).toBe("http");
      expect(res.error).toBe("Not authorized — please sign in again");
    }
  });

  it("returns friendly message for 401 with HTML body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: () => Promise.resolve("<html><body>Unauthorized</body></html>"),
    });

    const res = await apiGetJsonAuthed("/users/me/timeline", "token");

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Not authorized — please sign in again");
    }
  });

  it("returns normal HTTP error for 403 with JSON body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      text: () => Promise.resolve(JSON.stringify({ error: "Forbidden" })),
    });

    const res = await apiGetJsonAuthed("/users/me/timeline", "token");

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("HTTP 403");
    }
  });
});
