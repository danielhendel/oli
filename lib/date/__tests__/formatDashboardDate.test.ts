import { formatDashboardDate } from "../formatDashboardDate";

describe("formatDashboardDate", () => {
  it("formats weekday, month name, and day (en-US)", () => {
    const d = new Date("2026-05-13T12:00:00");
    expect(formatDashboardDate(d, "en-US")).toBe("Wednesday, May 13");
  });

  it("uses the provided locale", () => {
    const d = new Date("2026-05-13T12:00:00");
    expect(formatDashboardDate(d, "de-DE")).toMatch(/13/);
  });
});
