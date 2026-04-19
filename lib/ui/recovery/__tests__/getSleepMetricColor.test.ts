import { getSleepMetricColor, SLEEP_METRIC_TRACK_COLOR } from "@/lib/ui/recovery/getSleepMetricColor";

describe("getSleepMetricColor", () => {
  it("maps tiers to semantic fills and keeps a neutral track", () => {
    const optimal = getSleepMetricColor("Optimal");
    expect(optimal.trackColor).toBe(SLEEP_METRIC_TRACK_COLOR);
    expect(optimal.fillColor).toBe("#4F7CFF");

    const good = getSleepMetricColor("Good");
    expect(good.fillColor).toBe("#34C759");

    const fair = getSleepMetricColor("Fair");
    expect(fair.fillColor).toBe("#FF9F0A");

    const low = getSleepMetricColor("Pay attention");
    expect(low.fillColor).toBe("#FF3B30");
  });

  it("uses neutral fill when rating is absent", () => {
    const n = getSleepMetricColor(null);
    expect(n.trackColor).toBe(SLEEP_METRIC_TRACK_COLOR);
    expect(n.fillColor).toBe("#C7C7CC");
  });
});
