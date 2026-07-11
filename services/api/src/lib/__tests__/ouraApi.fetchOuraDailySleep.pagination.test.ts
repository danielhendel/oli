/**
 * GET /usercollection/daily_sleep must follow Oura JSON `next_token`.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { fetchOuraDailySleep, OuraApiError } from "../ouraApi";

const originalFetch = global.fetch;

describe("fetchOuraDailySleep pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requests next_token until exhausted and merges all pages", async () => {
    const fetchMock = jest.fn().mockImplementation(async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      expect(u).toContain("/daily_sleep");
      if (!u.includes("next_token")) {
        return {
          status: 200,
          json: async () => ({
            data: [{ id: "ds1", day: "2026-07-08", score: 70 }],
            next_token: "ds_page2",
          }),
        };
      }
      if (u.includes("next_token=ds_page2")) {
        return {
          status: 200,
          json: async () => ({
            data: [{ id: "ds2", day: "2026-07-09", score: 0 }],
          }),
        };
      }
      throw new Error(`unexpected fetch url: ${u}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await fetchOuraDailySleep("token", "2026-07-07", "2026-07-09", {
      requestId: "req-ds-paginate",
      uid: "u1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.map((d) => d.day)).toEqual(["2026-07-08", "2026-07-09"]);
    expect(out[1]?.score).toBe(0);
  });

  it("maps provider HTTP errors without logging the token", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 502,
      text: async () => "upstream",
    }) as unknown as typeof fetch;

    await expect(fetchOuraDailySleep("secret-token", "2026-07-01", "2026-07-02")).rejects.toBeInstanceOf(
      OuraApiError,
    );
  });
});
