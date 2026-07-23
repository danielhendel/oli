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

const bothSessions = { hasCurrentDayWorkout: true, hasCurrentDayCardio: true } as const;
const noSessions = { hasCurrentDayWorkout: false, hasCurrentDayCardio: false } as const;

describe("buildDailyMonitorActivityCardModel — compact contract", () => {
  it("presents primary Steps with category and applicable rows only", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: bothSessions,
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
    expect(model!.accessibilityLabel).not.toMatch(/so far/i);
  });

  it("omits Distance when unmeasured and does not show Unavailable", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: noSessions,
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 1000,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 1000,
            strengthSteps: 0,
            cardioSteps: 0,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(model!.rows.map((r) => r.key)).toEqual(["neat_steps"]);
    expect(JSON.stringify(model!.rows)).not.toMatch(/Unavailable/);
    expect(JSON.stringify(model!.rows)).not.toMatch(/Distance/);
  });

  it("shows measured Distance including zero; wrong-day facts stay absent", () => {
    const zero = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: noSessions,
      facts: facts({ date: "2026-07-20", activity: { steps: 1000, distanceKm: 0 } }),
    });
    expect(zero!.rows.find((r) => r.key === "distance")?.valueLabel).toBe(
      formatDistanceDualDisplay({ distanceKm: 0, locale: "en-US" }).primary,
    );

    expect(
      buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-19", activity: { steps: 5000, distanceKm: 3 } }),
      }),
    ).toBeNull();
  });

  it("omits Workout/Cardio Steps without sessions even when allocation has values", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: noSessions,
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 5000,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 4000,
            strengthSteps: 800,
            cardioSteps: 200,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(model!.rows.map((r) => r.key)).toEqual(["neat_steps"]);
    expect(model!.rows.find((r) => r.key === "workout_steps")).toBeUndefined();
    expect(model!.rows.find((r) => r.key === "cardio_steps")).toBeUndefined();
  });

  it("shows Workout Steps zero when workout exists and allocation is measured zero", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: { hasCurrentDayWorkout: true, hasCurrentDayCardio: false },
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 100,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 100,
            strengthSteps: 0,
            cardioSteps: 0,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(model!.rows.map((r) => r.key)).toEqual(["neat_steps", "workout_steps"]);
    expect(model!.rows.find((r) => r.key === "workout_steps")?.valueLabel).toBe("0 steps");
  });

  it("shows Unavailable for Workout Steps when workout exists but allocation is missing", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: { hasCurrentDayWorkout: true, hasCurrentDayCardio: false },
      facts: facts({
        date: "2026-07-20",
        activity: { steps: 100 },
      }),
    });
    expect(model!.rows.map((r) => r.key)).toEqual(["workout_steps"]);
    expect(model!.rows[0]?.valueLabel).toBe("Unavailable");
    expect(model!.rows[0]?.isAvailable).toBe(false);
  });

  it("shows Cardio Steps when cardio session exists; strength alone does not", () => {
    const cardioOnly = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: { hasCurrentDayWorkout: false, hasCurrentDayCardio: true },
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 2000,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 1500,
            strengthSteps: 0,
            cardioSteps: 500,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(cardioOnly!.rows.map((r) => r.key)).toEqual(["neat_steps", "cardio_steps"]);

    const strengthOnly = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: { hasCurrentDayWorkout: true, hasCurrentDayCardio: false },
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 2000,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 1500,
            strengthSteps: 500,
            cardioSteps: 0,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(strengthOnly!.rows.map((r) => r.key)).toEqual(["neat_steps", "workout_steps"]);
  });

  it("keeps stable order among present rows", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: bothSessions,
      facts: facts({
        date: "2026-07-20",
        activity: {
          steps: 9000,
          distanceKm: 1.2,
          stepsAllocation: {
            modelVersion: "activity_steps_allocation_v1",
            neatSteps: 7000,
            strengthSteps: 1000,
            cardioSteps: 1000,
            inputsUsed: [],
            inputsMissing: [],
          },
        },
      }),
    });
    expect(model!.rows.map((r) => r.key)).toEqual([
      "distance",
      "neat_steps",
      "workout_steps",
      "cardio_steps",
    ]);
  });

  it("updates the written rating when steps cross existing category boundaries", () => {
    const cases: { steps: number; label: (typeof ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS)[number] }[] = [
      { steps: 0, label: "Sedentary" },
      { steps: 5000, label: "Lightly Active" },
      { steps: 7500, label: "Moderately Active" },
      { steps: 10000, label: "Active" },
      { steps: 12500, label: "Very Active" },
      { steps: 15000, label: "Highly Active" },
    ];
    for (const c of cases) {
      const model = buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-20", activity: { steps: c.steps } }),
      });
      expect(model!.ratingLabel).toBe(c.label);
    }
  });

  it("presents valid zero steps and omits missing allocation rows", () => {
    const model = buildDailyMonitorActivityCardModel({
      requestedDay: "2026-07-20",
      sessionApplicability: noSessions,
      facts: facts({
        date: "2026-07-20",
        activity: { steps: 0 },
      }),
    });
    expect(model!.primaryLabel).toBe("0 Steps");
    expect(model!.ratingLabel).toBe("Sedentary");
    expect(model!.rows).toEqual([]);
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

  it("is absent when steps evidence is missing or wrong day", () => {
    expect(
      buildDailyMonitorActivityCardModel({
        requestedDay: "2026-07-20",
        facts: facts({ date: "2026-07-20", activity: {} }),
      }),
    ).toBeNull();
  });
});
