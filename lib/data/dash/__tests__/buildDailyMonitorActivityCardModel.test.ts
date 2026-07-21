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

describe("buildDailyMonitorActivityCardModel — compact contract", () => {
  it("presents primary as formatted Steps with so-far rating and allocation rows", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 2883,
          distanceKm: 2.1,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 2000,
            strengthSteps: 500,
            cardioSteps: 383,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(model).not.toBeNull();
    expect(model!.primaryLabel).toBe("2,883 Steps");
    expect(model!.ratingLabel).toMatch(/so far$/);
    expect(model!.rows.map((r) => r.label)).toEqual([
      "Distance",
      "NEAT Steps",
      "Workout Steps",
      "Cardio Steps",
    ]);
    expect(model!.rows[0]?.valueLabel).toBe("2.1 km");
    expect(model!.rows[1]?.valueLabel).toBe("2,000 steps");
    expect(model!.rows[2]?.valueLabel).toBe("500 steps");
    expect(model!.rows[3]?.valueLabel).toBe("383 steps");
    expect(model!.accessibilityLabel).toMatch(/Activity\. 2,883 Steps/);
    expect(model!.accessibilityLabel).toMatch(/so far/);
    expect(model!.accessibilityLabel).toMatch(/Opens Activity/);
    expect(model!.ratingLabel).toBe("Sedentary so far");
  });

  it("presents valid zero steps and keeps missing allocation Unavailable", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({
        date: "2026-07-20",
        activity: { steps: 0 },
      }),
    });
    expect(model!.primaryLabel).toBe("0 Steps");
    expect(model!.ratingLabel).toBe("Sedentary so far");
    expect(model!.rows.every((r) => r.key === "distance" || !r.isAvailable || r.valueLabel.includes("0"))).toBe(
      true,
    );
    expect(model!.rows.filter((r) => r.key !== "distance").every((r) => r.valueLabel === "Unavailable")).toBe(
      true,
    );
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

  it("is absent when steps evidence is missing or wrong day", () => {
    expect(
      buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-20", activity: {} }),
      }),
    ).toBeNull();
    expect(
      buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-19", activity: { steps: 5000 } }),
      }),
    ).toBeNull();
  });
});
