import {
  getSleepMetricProgress,
  getSleepMetricRating,
} from "@/lib/format/sleepMetricRowQueries";
import { buildSleepOliMetricRows } from "@/lib/format/sleepOliMetricRows";

describe("sleepMetricRowQueries", () => {
  it("reads rating and progress from row models", () => {
    const rows = buildSleepOliMetricRows({
      totalMinutes: 420,
      mainSleepMinutes: 420,
      efficiency: 0.9,
      latencyMinutes: 10,
      remSleepMinutes: 90,
      deepSleepMinutes: 60,
    });
    const total = rows.find((r) => r.key === "total")!;
    expect(getSleepMetricRating(total)).toBe(total.pill?.label ?? null);
    expect(getSleepMetricProgress(total)).toBe(total.barProgress);
  });
});
