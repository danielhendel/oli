import { describe, expect, it } from "@jest/globals";

import {
  classifyWorkoutEvidence,
  hasCardioNaturalLanguageEvidence,
  isEligibleCardioWorkout,
} from "@/lib/data/workouts/workoutEligibility";
import {
  isDisplayableCardioHistorySession,
  isSupportedCardioModalityLabel,
  isSupportedCardioSessionModality,
} from "@/lib/data/workouts/cardioSessionPresentation";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";

function item(partial: Partial<WorkoutHistoryItem>): WorkoutHistoryItem {
  return {
    id: "w",
    observedAt: "2026-03-11T10:00:00.000Z",
    sourceId: "apple_health",
    rawKind: "workout",
    title: "",
    start: "2026-03-11T10:00:00.000Z",
    end: "2026-03-11T10:30:00.000Z",
    durationMinutes: 30,
    ...partial,
  };
}

function sessionCardio(workouts: WorkoutHistoryItem[]): ReconciledWorkoutSession {
  return {
    id: "s1",
    day: "2026-03-11",
    sessionType: "cardio",
    title: "Cardio",
    titleSource: "fallback",
    start: workouts[0]?.start ?? null,
    end: workouts[0]?.end ?? null,
    durationMinutes: 30,
    calories: null,
    workouts,
    sourceSummaries: [],
    sourceCount: workouts.length,
  };
}

describe("cardio analytics (evidence) vs display (modality label)", () => {
  it("analytics-style evidence can classify Morning Run without distance", () => {
    expect(
      classifyWorkoutEvidence({
        rawKind: "workout",
        title: "Morning Run",
      }),
    ).toBe("cardio");
    expect(hasCardioNaturalLanguageEvidence("Morning Run", null, null, null)).toBe(true);
    expect(isEligibleCardioWorkout(item({ title: "Morning Run", rawKind: "workout" }))).toBe(true);
  });

  it("display surfaces reject generic Other modality even when miles exist (unsupported bucket)", () => {
    const otherWithMiles = item({
      id: "other",
      title: "Other",
      activityName: "Other",
      workoutType: "cardio",
      distanceMeters: 50 * 1609.344,
    });
    expect(isEligibleCardioWorkout(otherWithMiles)).toBe(true);
    expect(isSupportedCardioModalityLabel("Other")).toBe(false);

    const sess = sessionCardio([otherWithMiles]);
    expect(isSupportedCardioSessionModality(sess)).toBe(false);
    expect(isDisplayableCardioHistorySession(sess)).toBe(false);
  });

  it("display accepts Running with distance (supported modality)", () => {
    const run = item({
      id: "run",
      title: "Running",
      activityName: "Running",
      workoutType: "cardio",
      distanceMeters: 4 * 1609.344,
    });
    const sess = sessionCardio([run]);
    expect(isSupportedCardioSessionModality(sess)).toBe(true);
    expect(isDisplayableCardioHistorySession(sess)).toBe(true);
  });
});
