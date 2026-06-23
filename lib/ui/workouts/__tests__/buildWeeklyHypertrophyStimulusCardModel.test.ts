import {
  buildWeeklyHypertrophyStimulusCardModel,
  formatWeeklyWorkloadBand,
  WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE,
  WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE,
} from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import { buildHypertrophyStimulusWeekSummary } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekSummary";

describe("buildWeeklyHypertrophyStimulusCardModel", () => {
  it("returns null for an empty week", () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [],
    });

    expect(buildWeeklyHypertrophyStimulusCardModel(summary)).toBeNull();
  });

  it("returns null when only fallback exercises were logged", () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-fallback",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [{ exerciseId: "pec_stretch", reps: 10, rpe: 7 }],
        },
      ],
    });

    expect(buildWeeklyHypertrophyStimulusCardModel(summary)).toBeNull();
  });

  it("builds top regions and workload bands for seeded sessions", () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-1",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 8, rpe: 8 },
            { exerciseId: "squat", reps: 5, rpe: 9 },
          ],
        },
        {
          sessionId: "session-2",
          completedAt: "2026-03-12T12:00:00.000Z",
          sets: [{ exerciseId: "lateral_raise", reps: 12, rpe: 9 }],
        },
      ],
    });

    const model = buildWeeklyHypertrophyStimulusCardModel(summary);

    expect(model).not.toBeNull();
    expect(model!.title).toBe(WEEKLY_HYPERTROPHY_STIMULUS_CARD_TITLE);
    expect(model!.subtitle).toBe(WEEKLY_HYPERTROPHY_STIMULUS_CARD_SUBTITLE);
    expect(model!.topRegions.length).toBeGreaterThan(0);
    expect(model!.topRegions.length).toBeLessThanOrEqual(5);
    expect(model!.fatigueBand).toMatch(/Minimal|Low|Moderate|High|Very High/);
    expect(model!.recoveryBand).toMatch(/Minimal|Low|Moderate|High|Very High/);
    expect(model!.fallbackNote).toBeNull();
  });

  it("maps workload bands deterministically", () => {
    expect(formatWeeklyWorkloadBand(0)).toBe("Minimal");
    expect(formatWeeklyWorkloadBand(10)).toBe("Low");
    expect(formatWeeklyWorkloadBand(30)).toBe("Moderate");
    expect(formatWeeklyWorkloadBand(70)).toBe("High");
    expect(formatWeeklyWorkloadBand(120)).toBe("Very High");
  });

  it("includes a fallback note when many exercises lack intelligence", () => {
    const summary = buildHypertrophyStimulusWeekSummary({
      weekStart: "2026-03-09",
      sessions: [
        {
          sessionId: "session-mixed",
          completedAt: "2026-03-10T12:00:00.000Z",
          sets: [
            { exerciseId: "bench_press", reps: 8, rpe: 8 },
            { exerciseId: "pec_stretch", reps: 10, rpe: 7 },
            { exerciseId: "unknown_move", reps: 8, rpe: 8 },
          ],
        },
      ],
    });

    const model = buildWeeklyHypertrophyStimulusCardModel(summary);

    expect(model).not.toBeNull();
    expect(model!.fallbackNote).toBe("Some exercises aren't in the stimulus catalog yet.");
  });
});
