import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("../dateUtils", () => {
  const actual = jest.requireActual<typeof import("../dateUtils")>("../dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: jest.fn(() => "2026-04-06"),
  };
});

import { formatDayKeyWeekdayShortMonthDay, formatOverviewAsOfLabel } from "../dayKeyDisplayFormat";
import * as dateUtils from "../dateUtils";

const getToday = dateUtils.getTodayDayKeyLocal as jest.MockedFunction<typeof dateUtils.getTodayDayKeyLocal>;

describe("formatDayKeyWeekdayShortMonthDay", () => {
  it("formats Tue 3/31 for 2026-03-31", () => {
    expect(formatDayKeyWeekdayShortMonthDay("2026-03-31")).toBe("Tue 3/31");
  });
});

describe("formatOverviewAsOfLabel", () => {
  beforeEach(() => {
    getToday.mockReturnValue("2026-04-06");
  });

  it('returns "As of Today" when dayKey matches local today', () => {
    getToday.mockReturnValue("2026-03-31");
    expect(formatOverviewAsOfLabel("2026-03-31")).toBe("As of Today");
  });

  it('returns "As of {weekday} {M/D}" when dayKey is not today', () => {
    expect(formatOverviewAsOfLabel("2026-03-31")).toBe("As of Tue 3/31");
  });
});
