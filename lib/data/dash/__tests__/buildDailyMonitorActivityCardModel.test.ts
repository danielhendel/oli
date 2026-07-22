import {
  buildDailyMonitorActivityCardModel,
  resolveActivityMonitorPresence,
} from "../buildDailyMonitorActivityCardModel";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { formatDistanceDualDisplay } from "@/lib/modules/commandCenterCardio";
import { ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS } from "@/lib/utils/activityStepRating";

function facts(partial: Partial<DailyFactsDto> & { date: string }): DailyFactsDto {
  return {
    userId: "u1",
    ...partial,
  } as DailyFactsDto;
}

describe("buildDailyMonitorActivityCardModel — compact contract", () => {
  it("presents primary as formatted Steps with category rating and allocation rows", () => {
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
    expect(model!.ratingLabel).toBe("Sedentary");
    expect(model!.ratingLabel).not.toMatch(/so far/i);
    expect(model!.ratingTone).toBe("critical");
    expect(model!.rows.map((r) => r.label)).toEqual([
      "Distance",
      "NEAT Steps",
      "Workout Steps",
      "Cardio Steps",
    ]);
    expect(model!.rows[0]?.valueLabel).toBe(
      formatDistanceDualDisplay({ distanceKm: 2.1, locale: "en-US" }).primary,
    );
    expect(model!.rows[1]?.valueLabel).toBe("2,000 steps");
    expect(model!.rows[2]?.valueLabel).toBe("500 steps");
    expect(model!.rows[3]?.valueLabel).toBe("383 steps");
    expect(model!.accessibilityLabel).toMatch(/Activity\. 2,883 Steps/);
    expect(model!.accessibilityLabel).not.toMatch(/so far/i);
    expect(model!.accessibilityLabel).toMatch(/Opens Activity/);
    expect(model!.accessibilityLabel).not.toMatch(/health grade|fitness capacity/i);
  });

  it("updates the written rating when steps cross existing category boundaries", () => {
    const cases: { steps: number; label: (typeof ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS)[number] }[] = [
      { steps: 0, label: "Sedentary" },
      { steps: 4999, label: "Sedentary" },
      { steps: 5000, label: "Lightly Active" },
      { steps: 7499, label: "Lightly Active" },
      { steps: 7500, label: "Moderately Active" },
      { steps: 9999, label: "Moderately Active" },
      { steps: 10000, label: "Active" },
      { steps: 12499, label: "Active" },
      { steps: 12500, label: "Very Active" },
      { steps: 14999, label: "Very Active" },
      { steps: 15000, label: "Highly Active" },
    ];
    for (const c of cases) {
      const model = buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-20", activity: { steps: c.steps } }),
      });
      expect(model!.ratingLabel).toBe(c.label);
      expect(model!.ratingTone).toBeTruthy();
    }
  });

  it("keeps measured zero distance as zero and missing distance Unavailable", () => {
    const zero = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({ date: "2026-07-20", activity: { steps: 1000, distanceKm: 0 } }),
    });
    expect(zero!.rows[0]?.isAvailable).toBe(true);
    expect(zero!.rows[0]?.valueLabel).toBe(
      formatDistanceDualDisplay({ distanceKm: 0, locale: "en-US" }).primary,
    );

    const missing = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      facts: facts({ date: "2026-07-20", activity: { steps: 1000 } }),
    });
    expect(missing!.rows[0]?.valueLabel).toBe("Unavailable");
    expect(missing!.rows[0]?.isAvailable).toBe(false);
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
    expect(model!.ratingLabel).toBe("Sedentary");
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
        facts: facts({ date: "2026-07-19", activity: { steps: 5000, distanceKm: 3 } }),
      }),
    ).toBeNull();
  });
});
