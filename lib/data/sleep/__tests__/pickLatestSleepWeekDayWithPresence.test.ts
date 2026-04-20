import { pickLatestSleepWeekDayWithPresence } from "@/lib/data/sleep/pickLatestSleepWeekDayWithPresence";

describe("pickLatestSleepWeekDayWithPresence", () => {
  it("returns the latest ISO day key that has presence", () => {
    const keys = ["2026-04-05", "2026-04-06", "2026-04-07"] as const;
    const map = { "2026-04-05": false, "2026-04-06": true, "2026-04-07": true } as Record<string, boolean>;
    expect(pickLatestSleepWeekDayWithPresence(keys, map)).toBe("2026-04-07");
  });

  it("returns null when no day has presence", () => {
    expect(pickLatestSleepWeekDayWithPresence(["2026-04-05", "2026-04-06"], { "2026-04-05": false })).toBeNull();
  });
});
