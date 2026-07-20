import {
  buildDailyMonitorStressCardModel,
  resolveStressMonitorPresence,
} from "../buildDailyMonitorStressCardModel";
import type { OuraDailyStressDayDto } from "@oli/contracts/ouraVendor";

describe("buildDailyMonitorStressCardModel", () => {
  it("presents current-day Oura stress summary without inventing a score", () => {
    const day: OuraDailyStressDayDto = {
      day: "2026-07-20",
      daySummary: "normal",
      stressHighSeconds: 3600,
      recoveryHighSeconds: 1800,
      source: "oura",
    } as OuraDailyStressDayDto;
    const model = buildDailyMonitorStressCardModel({
      requestedDay: "2026-07-20",
      day,
    });
    expect(model?.daySummaryLabel).toBe("Normal");
    expect(model?.sourceLabel).toBe("Oura");
    expect(model?.stressedMinutesLabel).toBe("60 min");
    expect(JSON.stringify(model)).not.toMatch(/"score"|0–100|Deficient|Elite/);
    expect(
      resolveStressMonitorPresence({
        loading: false,
        error: null,
        ouraDisconnected: false,
        model,
      }),
    ).toBe("present_complete");
  });

  it("rejects prior-day stress", () => {
    expect(
      buildDailyMonitorStressCardModel({
        requestedDay: "2026-07-20",
        day: {
          day: "2026-07-19",
          daySummary: "stressful",
          source: "oura",
        } as OuraDailyStressDayDto,
      }),
    ).toBeNull();
  });

  it("marks disconnect without day evidence as unavailable_source", () => {
    expect(
      resolveStressMonitorPresence({
        loading: false,
        error: null,
        ouraDisconnected: true,
        model: null,
      }),
    ).toBe("unavailable_source");
  });
});
