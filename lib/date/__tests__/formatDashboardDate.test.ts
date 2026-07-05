import { formatDashboardDate, formatTodayDashboardDate } from "@/lib/date/formatDashboardDate";

describe("formatDashboardDate", () => {
  it("formats weekday, month, and day", () => {
    const date = new Date("2026-07-05T12:00:00");
    expect(formatDashboardDate(date, "en-US")).toMatch(/Sunday/);
    expect(formatDashboardDate(date, "en-US")).toMatch(/July/);
    expect(formatDashboardDate(date, "en-US")).toMatch(/5/);
  });
});

describe("formatTodayDashboardDate", () => {
  it("prefixes Today to the formatted date", () => {
    const date = new Date("2026-07-05T12:00:00");
    expect(formatTodayDashboardDate(date, "en-US")).toBe(`Today ${formatDashboardDate(date, "en-US")}`);
  });
});
