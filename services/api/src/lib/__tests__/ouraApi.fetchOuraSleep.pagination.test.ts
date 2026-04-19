/**
 * GET /usercollection/sleep must follow Oura JSON `next_token` or the newest rows are missing.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { fetchOuraSleep } from "../ouraApi";

const originalFetch = global.fetch;

describe("fetchOuraSleep pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requests next_token until exhausted and merges all pages", async () => {
    const sleepA = {
      id: "older",
      bed_time: "2026-04-10T22:00:00.000Z",
      wake_time: "2026-04-11T06:00:00.000Z",
      total_sleep_duration: 28800,
      type: "long_sleep",
    };
    const sleepB = {
      id: "newest",
      bed_time: "2026-04-18T22:00:00.000Z",
      wake_time: "2026-04-19T11:00:00.000Z",
      total_sleep_duration: 29160,
      type: "long_sleep",
    };

    const fetchMock = jest.fn().mockImplementation(async (url: string | URL) => {
      const u = typeof url === "string" ? url : url.toString();
      if (!u.includes("next_token")) {
        return {
          status: 200,
          json: async () => ({
            data: [sleepA],
            next_token: "page2token",
          }),
        };
      }
      if (u.includes("next_token=page2token")) {
        return {
          status: 200,
          json: async () => ({
            data: [sleepB],
          }),
        };
      }
      throw new Error(`unexpected fetch url: ${u}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await fetchOuraSleep("token", "2026-03-20", "2026-04-20", {
      requestId: "req-paginate",
      uid: "u1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.map((d) => d.id)).toEqual(["older", "newest"]);
    const firstUrl = fetchMock.mock.calls[0]?.[0];
    expect(String(firstUrl)).not.toContain("next_token");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("next_token=page2token");
  });

  it("single-page response without next_token returns one page only", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        data: [{ id: "only", bed_time: "2026-04-01T22:00:00.000Z", wake_time: "2026-04-02T06:00:00.000Z", total_sleep_duration: 28800, type: "long_sleep" }],
      }),
    }) as unknown as typeof fetch;

    const out = await fetchOuraSleep("t", "2026-04-01", "2026-04-02");
    expect(out).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
