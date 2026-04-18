import { describe, it, expect } from "@jest/globals";
import { localCalendarDayKeyFromIsoInTimeZone } from "../localCalendarDayKey";

describe("localCalendarDayKeyFromIsoInTimeZone", () => {
  it("maps instant to local calendar day in IANA zone (no UTC calendar leakage)", () => {
    // 2026-04-08 01:30 UTC = still 2026-04-07 evening in New York
    expect(localCalendarDayKeyFromIsoInTimeZone("2026-04-08T01:30:00.000Z", "America/New_York")).toBe(
      "2026-04-07",
    );
  });

  it("uses en-CA YYYY-MM-DD for midnight boundary in Los Angeles", () => {
    // Just after midnight local — same calendar day as start-of-day bucket tests
    expect(localCalendarDayKeyFromIsoInTimeZone("2026-06-15T07:00:00.000Z", "America/Los_Angeles")).toBe(
      "2026-06-15",
    );
  });

  it("returns null for invalid ISO", () => {
    expect(localCalendarDayKeyFromIsoInTimeZone("not-a-date", "America/New_York")).toBeNull();
  });

  it("returns null for invalid timezone", () => {
    expect(localCalendarDayKeyFromIsoInTimeZone("2026-01-01T12:00:00.000Z", "Not/A_Zone")).toBeNull();
  });
});
