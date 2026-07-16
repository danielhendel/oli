/**
 * GET /usercollection/daily_stress must follow Oura JSON `next_token`.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { fetchOuraDailyStress, OuraApiError } from "../ouraApi";

const originalFetch = global.fetch;

describe("fetchOuraDailyStress pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requests next_token until exhausted and merges all pages", async () => {
    const fetchMock = jest.fn().mockImplementation(async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      expect(u).toContain("/daily_stress");
      if (!u.includes("next_token")) {
        return {
          status: 200,
          json: async () => ({
            data: [{ id: "st1", day: "2026-07-08", day_summary: "normal", stress_high: 100, recovery_high: 50 }],
            next_token: "st_page2",
          }),
        };
      }
      if (u.includes("next_token=st_page2")) {
        return {
          status: 200,
          json: async () => ({
            data: [{ id: "st2", day: "2026-07-09", day_summary: "stressful", stress_high: 200, recovery_high: null }],
          }),
        };
      }
      throw new Error(`unexpected fetch url: ${u}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await fetchOuraDailyStress("token", "2026-07-07", "2026-07-09", {
      requestId: "req-st-paginate",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.map((d) => d.day)).toEqual(["2026-07-08", "2026-07-09"]);
    expect(out[1]?.day_summary).toBe("stressful");
  });

  it("maps provider HTTP errors without logging the token", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 502,
      text: async () => "upstream",
    }) as unknown as typeof fetch;

    await expect(fetchOuraDailyStress("secret-token", "2026-07-01", "2026-07-02")).rejects.toBeInstanceOf(
      OuraApiError,
    );
  });
});
