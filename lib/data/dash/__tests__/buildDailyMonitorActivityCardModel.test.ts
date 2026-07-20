import {
  buildDailyMonitorActivityCardModel,
  resolveActivityMonitorPresence,
} from "../buildDailyMonitorActivityCardModel";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";

function facts(partial: Partial<DailyFactsDto> & { date: string }): DailyFactsDto {
  return {
    userId: "u1",
    ...partial,
  } as DailyFactsDto;
}

describe("buildDailyMonitorActivityCardModel", () => {
  it("presents current-day steps including valid zero", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({
        date: "2026-07-20",
        activity: { steps: 0, moveMinutes: 12, distanceKm: 0.1 },
      }),
    });
    expect(model).not.toBeNull();
    expect(model!.steps).toBe(0);
    expect(model!.stepsLabel).toBe("0");
    expect(model!.accessibilityLabel).toMatch(/0 steps/i);
    expect(resolveActivityMonitorPresence({
      loading: false,
      error: null,
      model,
      factsDay: "2026-07-20",
      requestedDay: "2026-07-20",
    })).toBe("present_complete");
  });

  it("marks missing secondary metrics unavailable rather than inventing zero", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({
        date: "2026-07-20",
        activity: { steps: 1200 },
      }),
    });
    expect(model).not.toBeNull();
    expect(model!.rows.every((r) => !r.isAvailable)).toBe(true);
    expect(model!.rows.every((r) => r.valueLabel === "Unavailable")).toBe(true);
    expect(
      resolveActivityMonitorPresence({
        loading: false,
        error: null,
        model,
        factsDay: "2026-07-20",
        requestedDay: "2026-07-20",
      }),
    ).toBe("present_partial");
  });

  it("is absent when steps evidence is missing", () => {
    expect(
      buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-20", activity: {} }),
      }),
    ).toBeNull();
  });

  it("is absent when DailyFacts belong to another day", () => {
    expect(
      buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-19", activity: { steps: 5000 } }),
      }),
    ).toBeNull();
  });

  it("presents a positive step count", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({
        date: "2026-07-20",
        activity: { steps: 8432, moveMinutes: 40, distanceKm: 5.2 },
      }),
    });
    expect(model?.steps).toBe(8432);
    expect(model?.rows.every((r) => r.isAvailable)).toBe(true);
    expect(
      resolveActivityMonitorPresence({
        loading: false,
        error: null,
        model,
        factsDay: "2026-07-20",
        requestedDay: "2026-07-20",
      }),
    ).toBe("present_complete");
  });
});
