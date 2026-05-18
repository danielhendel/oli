import { describe, expect, it } from "@jest/globals";

import { interpretDailyFactsSleepRollupEntry } from "@/lib/data/dash/dailyFactsSleepRollupEntry";

describe("interpretDailyFactsSleepRollupEntry", () => {
  it("maps ready DailyFacts with sleep to numeric minutes", () => {
    const entry = interpretDailyFactsSleepRollupEntry({
      ok: true,
      json: {
        day: "2026-05-07",
        sleep: { totalMinutes: 492, mainSleepMinutes: 480 },
      },
    } as never);
    expect(entry).toEqual({ kind: "numeric", minutes: 492 });
  });

  it("returns absent when sleep has no positive duration", () => {
    const entry = interpretDailyFactsSleepRollupEntry({
      ok: true,
      json: { day: "2026-05-07", sleep: { totalMinutes: 0, mainSleepMinutes: 0 } },
    } as never);
    expect(entry).toEqual({ kind: "absent" });
  });
});
