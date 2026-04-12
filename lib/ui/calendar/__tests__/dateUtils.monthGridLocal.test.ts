import { getMonthGridLocal } from "@/lib/ui/calendar/dateUtils";

/** Activity calendar uses `MonthGrid` with `dayKeyBasis="local"` so cell keys align with Apple Health day ingestion. */
describe("getMonthGridLocal", () => {
  it("includes one DayKey per calendar day in the target month (local calendar)", () => {
    const grid = getMonthGridLocal({ year: 2026, month: 6 });
    const keys = grid.flat().filter((k): k is string => k != null);
    expect(keys.length).toBe(30);
    expect(new Set(keys).size).toBe(30);
    expect(keys.every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))).toBe(true);
  });
});
