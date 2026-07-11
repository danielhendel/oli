import {
  buildDailyReadinessCardModel,
  dailyReadinessCardAccessibilityLabel,
} from "@/lib/data/dash/buildDailyReadinessCardModel";

describe("buildDailyReadinessCardModel", () => {
  it("preserves Oura readiness score exactly with contributor rows", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-05",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        sourceId: "oura",
        score: 78,
        contributors: {
          resting_heart_rate: 80,
          hrv_balance: 90,
          body_temperature: 88,
          recovery_index: 70,
          sleep_balance: 75,
        },
      },
      exactDayRestingHeartRateBpm: 49,
    });
    expect(model.headlineValueText).toBe("78");
    expect(model.sourceLabel).toBe("Oura");
    expect(model.hasAnySignal).toBe(true);
    expect(model.summarySentence).toContain("recovery");
    expect(model.metricRows.map((r) => r.id)).toEqual([
      "resting_heart_rate",
      "hrv_balance",
      "body_temperature",
      "recovery_index",
      "sleep_balance",
    ]);
    expect(model.metricRows[0]?.displayValue).toBe("49 bpm");
    expect(model.metricRows.some((r) => r.label === "Sleep")).toBe(false);
  });

  it("does not treat fallback readiness as current-day Dash truth", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-09",
        isFallback: true,
        day: "2026-07-09",
        sourceId: "oura",
        score: 83,
        contributors: { hrv_balance: 90 },
      },
    });
    expect(model.hasAnySignal).toBe(false);
    expect(model.headlineValueText).toBeNull();
    expect(model.metricRows).toEqual([]);
    expect(model.summarySentence).toContain("No current-day readiness");
  });

  it("does not crash when readiness is missing", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-05",
      ouraConnected: true,
      readinessView: null,
    });
    expect(model.hasAnySignal).toBe(false);
    expect(dailyReadinessCardAccessibilityLabel(model)).toContain("No current-day");
    expect(model.emptyStateTitle).toBe("No readiness for today");
    expect(model.metricRows).toEqual([]);
  });

  it("rejects readiness whose resolvedDay differs from requested day even if isFallback is false", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-09",
        isFallback: false,
        day: "2026-07-09",
        sourceId: "oura",
        score: 90,
      },
    });
    expect(model.hasAnySignal).toBe(false);
    expect(model.headlineValueText).toBeNull();
    expect(model.metricRows).toEqual([]);
  });

  it("shows disconnected copy when Oura is not connected", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: false,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 83,
      },
    });
    expect(model.hasAnySignal).toBe(false);
    expect(model.emptyStateTitle).toBe("Oura not connected");
    expect(model.summarySentence).toContain("Connect Oura");
    expect(model.metricRows).toEqual([]);
  });

  it("treats score 0 as a valid current-day signal", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 0,
      },
    });
    expect(model.hasAnySignal).toBe(true);
    expect(model.headlineValueText).toBe("0");
    expect(model.ratingLabel).toBe("Pay attention");
    expect(model.metricRows).toHaveLength(5);
  });

  it("keeps score when some contributors are missing", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 86,
        contributors: { hrv_balance: 90 },
      },
    });
    expect(model.hasAnySignal).toBe(true);
    expect(model.headlineValueText).toBe("86");
    expect(model.metricRows.find((r) => r.id === "hrv_balance")?.isAvailable).toBe(true);
    expect(model.metricRows.find((r) => r.id === "recovery_index")?.isAvailable).toBe(false);
  });

  it("does not leak prior-user readiness when day/view disagree after user switch", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      readinessView: {
        requestedDay: "2026-07-09",
        resolvedDay: "2026-07-09",
        isFallback: false,
        day: "2026-07-09",
        sourceId: "oura",
        score: 99,
      },
    });
    expect(model.hasAnySignal).toBe(false);
    expect(model.headlineValueText).toBeNull();
  });

  it("does not use mismatched SleepNight RHR when bpm is omitted", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-10",
      ouraConnected: true,
      exactDayRestingHeartRateBpm: null,
      readinessView: {
        requestedDay: "2026-07-10",
        resolvedDay: "2026-07-10",
        isFallback: false,
        day: "2026-07-10",
        sourceId: "oura",
        score: 86,
        contributors: { resting_heart_rate: 80 },
      },
    });
    expect(model.metricRows[0]?.displayValue).toBe("Good");
    expect(model.metricRows[0]?.displayValue).not.toMatch(/bpm/);
  });
});
