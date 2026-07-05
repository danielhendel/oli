import {
  buildDailyReadinessCardModel,
  dailyReadinessCardAccessibilityLabel,
} from "@/lib/data/dash/buildDailyReadinessCardModel";

describe("buildDailyReadinessCardModel", () => {
  it("preserves Oura readiness score exactly", () => {
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
      },
    });
    expect(model.headlineValueText).toBe("78");
    expect(model.sourceLabel).toBe("Oura");
    expect(model.hasAnySignal).toBe(true);
    expect(model.summarySentence).toContain("Oura readiness");
  });

  it("does not crash when readiness is missing", () => {
    const model = buildDailyReadinessCardModel({
      day: "2026-07-05",
      ouraConnected: true,
      readinessView: null,
    });
    expect(model.hasAnySignal).toBe(false);
    expect(dailyReadinessCardAccessibilityLabel(model)).toContain("Waiting");
  });
});
