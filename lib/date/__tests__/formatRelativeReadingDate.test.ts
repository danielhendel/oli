import { describe, expect, it } from "@jest/globals";

import {
  formatAsOfReadingDayKeyOnly,
  formatAsOfReadingLabel,
  ordinalSuffix,
} from "@/lib/date/formatRelativeReadingDate";

describe("ordinalSuffix", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
  ])("%s → %s", (n, expected) => {
    expect(ordinalSuffix(n)).toBe(expected);
  });
});

describe("formatAsOfReadingLabel", () => {
  const tz = "UTC";

  it('returns "As of today" when reading instant is same calendar day as now', () => {
    const now = new Date(Date.UTC(2026, 4, 7, 18, 0, 0));
    expect(formatAsOfReadingLabel("2026-05-07T08:00:00.000Z", { now, timeZone: tz })).toBe("As of today");
  });

  it('returns "As of yesterday" for previous calendar day', () => {
    const now = new Date(Date.UTC(2026, 4, 7, 18, 0, 0));
    expect(formatAsOfReadingLabel("2026-05-06T23:59:59.000Z", { now, timeZone: tz })).toBe("As of yesterday");
  });

  it("formats older readings as month + ordinal day", () => {
    const now = new Date(Date.UTC(2026, 4, 8, 12, 0, 0));
    expect(formatAsOfReadingLabel("2026-05-04T12:00:00.000Z", { now, timeZone: tz })).toBe("As of May 4th");
  });
});

describe("formatAsOfReadingDayKeyOnly", () => {
  const tz = "UTC";

  it('matches today/yesterday without an ISO observation string', () => {
    const now = new Date(Date.UTC(2026, 4, 15, 12, 0, 0));
    expect(formatAsOfReadingDayKeyOnly("2026-05-15", { now, timeZone: tz })).toBe("As of today");
    expect(formatAsOfReadingDayKeyOnly("2026-05-14", { now, timeZone: tz })).toBe("As of yesterday");
  });

  it.each([
    ["2026-05-01", "As of May 1st"],
    ["2026-05-02", "As of May 2nd"],
    ["2026-05-03", "As of May 3rd"],
    ["2026-05-04", "As of May 4th"],
    ["2026-05-11", "As of May 11th"],
    ["2026-05-12", "As of May 12th"],
    ["2026-05-13", "As of May 13th"],
  ])("%s → %s", (dayKey, expected) => {
    const now = new Date(Date.UTC(2026, 4, 20, 12, 0, 0));
    expect(formatAsOfReadingDayKeyOnly(dayKey, { now, timeZone: tz })).toBe(expected);
  });
});
