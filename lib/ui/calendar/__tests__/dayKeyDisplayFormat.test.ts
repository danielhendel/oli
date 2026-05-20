import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("../dateUtils", () => {
  const actual = jest.requireActual<typeof import("../dateUtils")>("../dateUtils");
  return {
    ...actual,
    getTodayDayKeyLocal: jest.fn(() => "2026-04-06"),
  };
});

import {
  formatDayKeyStackNavTitle,
  formatDayKeyWeekdayShortMonthDay,
  formatOverviewAsOfLabel,
  formatWeekdayFullFromDayKey,
  formatWeekdayUpperFromDayKey,
} from "../dayKeyDisplayFormat";
import * as dateUtils from "../dateUtils";

const getToday = dateUtils.getTodayDayKeyLocal as jest.MockedFunction<typeof dateUtils.getTodayDayKeyLocal>;

describe("formatDayKeyStackNavTitle", () => {
  it("includes weekday, month name, day, and year (stack header style)", () => {
    const s = formatDayKeyStackNavTitle("2026-04-14");
    expect(s).toMatch(/Tue/);
    expect(s).toMatch(/Apr/);
    expect(s).toMatch(/14/);
    expect(s).toMatch(/2026/);
  });
});

describe("formatDayKeyWeekdayShortMonthDay", () => {
  it("formats Tue 3/31 for 2026-03-31", () => {
    expect(formatDayKeyWeekdayShortMonthDay("2026-03-31")).toBe("Tue 3/31");
  });
});

describe("formatWeekdayUpperFromDayKey", () => {
  it("uppercases the long weekday for a calendar day", () => {
    expect(formatWeekdayUpperFromDayKey("2026-03-09")).toBe(
      formatWeekdayFullFromDayKey("2026-03-09").toUpperCase(),
    );
  });
});

describe("formatWeekdayFullFromDayKey", () => {
  it("returns empty string when dayKey is not parseable", () => {
    expect(formatWeekdayFullFromDayKey("")).toBe("");
    expect(formatWeekdayFullFromDayKey("not-a-date")).toBe("");
  });

  it("matches Intl long weekday for UTC calendar day (locale from environment)", () => {
    const dayKey = "2026-05-03";
    expect(formatWeekdayFullFromDayKey(dayKey)).toBe(
      new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(
        new Date(`${dayKey}T12:00:00.000Z`),
      ),
    );
  });

  it("Sunday and Monday reference dates yield distinct labels", () => {
    expect(formatWeekdayFullFromDayKey("2026-05-03")).not.toBe(formatWeekdayFullFromDayKey("2026-05-04"));
    expect(formatWeekdayFullFromDayKey("2026-05-03").length).toBeGreaterThan(0);
  });

  it('English locale: Sunday and Monday for UTC reference dates', () => {
    expect(
      new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
        new Date("2026-05-03T12:00:00.000Z"),
      ),
    ).toBe("Sunday");
    expect(
      new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
        new Date("2026-05-04T12:00:00.000Z"),
      ),
    ).toBe("Monday");
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
