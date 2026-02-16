// lib/logging/__tests__/selectors.test.ts
import { getWeekDays, startOfWeekSunYMD, isTodayYMD, addDaysYMD } from "../../logging/selectors";
import { toYMD } from "../../util/date";

describe("logging selectors (week)", () => {
  it("returns 7 days from Sunday to Saturday", () => {
    const days = getWeekDays("2025-09-06"); // Sat
    expect(days).toHaveLength(7);
    const first = days[0]!;
    const last = days[6]!;
    expect(first.label).toBe("Sun");
    expect(last.label).toBe("Sat");
  });

  it("startOfWeekSunYMD starts on Sunday", () => {
    const start = startOfWeekSunYMD("2025-09-06"); // Sat
    // For the week of 2025-09-06, Sunday is 2025-08-31
    expect(start).toBe("2025-08-31");
  });

  it("today detection is correct", () => {
    const today = toYMD(new Date());
    expect(isTodayYMD(today)).toBe(true);
    expect(isTodayYMD(addDaysYMD(today, -1))).toBe(false);
  });
});
