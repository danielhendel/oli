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
} from "../bodyHistoryRange";

describe("bodyHistoryRange", () => {
  beforeEach(() => {
    mockGetToday.mockReturnValue("2026-01-15");
  });

  it("maps chart All to the same window as 5Y (backfill horizon)", () => {
    expect(BODY_CHART_ALL_EFFECTIVE_RANGE).toBe("5Y");
    expect(resolveBodyHistoryQueryWindow("All")).toEqual(resolveBodyHistoryQueryWindow("5Y"));
  });

  it("1Y window ends at today + raw-events end buffer and starts 365 local days earlier", () => {
    const w = resolveBodyHistoryQueryWindow("1Y");
    expect(w.end).toBe(addDaysToDayKey("2026-01-15", RAW_EVENTS_QUERY_END_DAY_BUFFER));
    expect(w.start).toBe(addDaysToDayKey("2026-01-15", -365));
    const five = resolveBodyHistoryQueryWindow("5Y");
    expect(w.start > five.start).toBe(true);
  });

  it("rangeToStartEnd(All) is unbounded marker for legacy callers", () => {
    expect(rangeToStartEnd("All")).toBe("all");
  });
});
