import {
  buildDashReadinessMetricRows,
  displayBodyTemperatureRow,
  displayRestingHeartRateRow,
} from "@/lib/data/dash/buildDashReadinessMetricRows";

describe("buildDashReadinessMetricRows", () => {
  it("returns five rows in fixed order and omits excluded contributors", () => {
    const rows = buildDashReadinessMetricRows({
      contributors: {
        resting_heart_rate: 80,
        hrv_balance: 90,
        body_temperature: 88,
        recovery_index: 70,
        sleep_balance: 75,
        sleep: 99,
        sleep_regularity: 99,
        previous_day_activity: 99,
        activity_balance: 99,
      },
      exactDayRestingHeartRateBpm: 49,
    });
    expect(rows.map((r) => r.id)).toEqual([
      "resting_heart_rate",
      "hrv_balance",
      "body_temperature",
      "recovery_index",
      "sleep_balance",
    ]);
    expect(rows.map((r) => r.label).join("|")).not.toMatch(/Sleep regularity|Previous day|Activity balance/);
    expect(rows.find((r) => r.id === "resting_heart_rate")?.displayValue).toBe("49 bpm");
    expect(rows.find((r) => r.id === "hrv_balance")?.displayValue).toBe("Optimal");
    expect(rows.find((r) => r.id === "recovery_index")?.displayValue).toBe("Good");
  });

  it("shows contributor tier for RHR when bpm is absent (never fabricates bpm from score)", () => {
    const row = displayRestingHeartRateRow({
      exactDayRestingHeartRateBpm: null,
      contributorScore: 80,
    });
    expect(row.displayValue).toBe("Good");
    expect(row.displayValue).not.toMatch(/bpm/i);
  });

  it("rejects mismatched prior-night bpm outside physiological range", () => {
    const row = displayRestingHeartRateRow({
      exactDayRestingHeartRateBpm: 5,
      contributorScore: 80,
    });
    expect(row.displayValue).toBe("Good");
  });

  it("prefers temperature deviation over contributor score", () => {
    const row = displayBodyTemperatureRow({
      contributors: { body_temperature: 90, temperature_deviation: 0.1 },
    });
    expect(row.displayValue).toBe("+0.1°C");
  });

  it("falls back to body temperature tier when deviation absent", () => {
    const row = displayBodyTemperatureRow({
      contributors: { body_temperature: 90 },
    });
    expect(row.displayValue).toBe("Optimal");
  });

  it("marks missing contributors unavailable without inventing values", () => {
    const rows = buildDashReadinessMetricRows({ contributors: {} });
    expect(rows.every((r) => r.isAvailable === false)).toBe(true);
    expect(rows.every((r) => r.accessibilityValue === "Not available")).toBe(true);
  });
});
