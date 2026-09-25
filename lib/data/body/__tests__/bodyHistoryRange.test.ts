import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetToday = jest.fn(() => "2026-01-15");

jest.mock("@/lib/time/dayKey", () => ({
  getTodayDayKey: () => mockGetToday(),
}));

import {
  BODY_CHART_ALL_EFFECTIVE_RANGE,
  RAW_EVENTS_QUERY_END_DAY_BUFFER,
  addDaysToDayKey,
  rangeToStartEnd,
  resolveBodyHistoryQueryWindow,
  rollingLookbackWindowForAnchorDay,
  ytdBoundsForAnchorDay,
} from "../bodyHistoryRange";

describe("bodyHistoryRange", () => {
  beforeEach(() => {
    mockGetToday.mockReturnValue("2026-01-15");
  });

  it("maps chart All to the same window as 5Y (backfill horizon)", () => {
    expect(BODY_CHART_ALL_EFFECTIVE_RANGE).toBe("5Y");
    expect(resolveBodyHistoryQueryWindow("All")).toEqual(resolveBodyHistoryQueryWindow("5Y"));
  });

  it("1Y window ends at today + raw-events end buffer and starts one calendar year earlier", () => {
    const w = resolveBodyHistoryQueryWindow("1Y");
    expect(w.end).toBe(addDaysToDayKey("2026-01-15", RAW_EVENTS_QUERY_END_DAY_BUFFER));
    expect(w.start).toBe("2025-01-15");
    const five = resolveBodyHistoryQueryWindow("5Y");
    expect(w.start > five.start).toBe(true);
  });

  it("6M / 3Y / 5Y use calendar month and year subtraction", () => {
    mockGetToday.mockReturnValue("2026-03-31");
    expect(resolveBodyHistoryQueryWindow("6M").start).toBe("2025-09-30");
    expect(resolveBodyHistoryQueryWindow("3Y").start).toBe("2023-03-31");
    expect(resolveBodyHistoryQueryWindow("5Y").start).toBe("2021-03-31");
  });

  it("rangeToStartEnd(All) is unbounded marker for legacy callers", () => {
    expect(rangeToStartEnd("All")).toBe("all");
  });

  it("YTD window is Jan 1 of anchor year through anchor + end buffer", () => {
    expect(ytdBoundsForAnchorDay("2026-03-20")).toEqual({
      start: "2026-01-01",
      end: addDaysToDayKey("2026-03-20", RAW_EVENTS_QUERY_END_DAY_BUFFER),
    });
    expect(resolveBodyHistoryQueryWindow("YTD", { anchorDayKey: "2025-11-02" })).toEqual(
      ytdBoundsForAnchorDay("2025-11-02"),
    );
  });

  it("rollingLookbackWindowForAnchorDay mirrors bounded end buffer and lookback from anchor", () => {
    expect(rollingLookbackWindowForAnchorDay("2026-03-20", 90)).toEqual({
      start: addDaysToDayKey("2026-03-20", -90),
      end: addDaysToDayKey("2026-03-20", RAW_EVENTS_QUERY_END_DAY_BUFFER),
    });
  });
});
