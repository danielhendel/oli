import { buildSleepOliMetricRows } from "@/lib/format/sleepOliMetricRows";

describe("buildSleepOliMetricRows", () => {
  it("returns five rows without awakenings, with pills when values exist", () => {
    const rows = buildSleepOliMetricRows({
      totalMinutes: 420,
      mainSleepMinutes: 420,
      efficiency: 0.88,
      latencyMinutes: 12,
      remSleepMinutes: 90,
      deepSleepMinutes: 70,
    });
    expect(rows.map((r) => r.key)).toEqual(["total", "efficiency", "latency", "rem", "deep"]);
    expect(rows.every((r) => !r.label.toLowerCase().includes("awaken"))).toBe(true);
    expect(rows.every((r) => r.pill != null)).toBe(true);
  });
});
