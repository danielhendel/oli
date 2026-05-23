/**
 * Phase 2A — Pure helper that builds {@link ActivityStepsAllocationV1} from a day's
 * resolved total steps and the day's `WorkoutCanonicalEvent`s.
 *
 * Algorithm summary:
 * 1. Require an integer-normalizable non-negative `totalSteps`.
 * 2. Consider only `kind === "workout"` events whose `sport` classifies as cardio or strength.
 * 3. Among classified workouts, attribute steps only from events whose `steps` is a finite
 *    non-negative number.
 * 4. Resolve overlaps deterministically: earlier `start` wins; ties broken by lexicographic `id`.
 * 5. Derive `neatSteps = totalSteps - strengthSteps - cardioSteps` and enforce the
 *    partition invariant `neatSteps + strengthSteps + cardioSteps === totalSteps`.
 * 6. Return `undefined` if any invariant fails (strict fail-closed) — never invent.
 *
 * Energy is intentionally NOT touched. This helper only produces the step partition.
 */

import { classifyWorkoutSportForDailyFactsRollup } from "@/lib/shared/workoutClassification";
import type {
  ActivityStepsAllocationV1,
  WorkoutCanonicalEvent,
} from "../types/health";

type WorkoutClass = "cardio" | "strength";

interface AttributedWorkout {
  id: string;
  start: string;
  end: string;
  classification: WorkoutClass;
  steps: number;
}

const isFiniteNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isInteger(value);

const isFiniteNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const normalizeToInteger = (value: number): number => Math.round(value);

const parseInstant = (iso: string): number => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Number.NaN;
};

/**
 * Drop later-starting workouts that overlap an earlier-kept workout's `[start, end]` window.
 * Sorts by start ASC, ties broken by lexicographic `id` ASC. Returns events in the
 * original sort order with overlaps filtered out.
 */
const dropOverlapsKeepEarlier = (
  workouts: AttributedWorkout[],
): AttributedWorkout[] => {
  const sorted = [...workouts].sort((a, b) => {
    const aStart = parseInstant(a.start);
    const bStart = parseInstant(b.start);
    if (aStart !== bStart) return aStart - bStart;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const kept: AttributedWorkout[] = [];
  for (const w of sorted) {
    const wStart = parseInstant(w.start);
    const wEnd = parseInstant(w.end);
    // Skip events with un-parsable bounds entirely (defensive — mapper guarantees ISO strings).
    if (!Number.isFinite(wStart) || !Number.isFinite(wEnd) || wEnd < wStart) continue;
    const overlapsEarlier = kept.some((k) => {
      const kStart = parseInstant(k.start);
      const kEnd = parseInstant(k.end);
      // Half-open intersection: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅.
      return wStart < kEnd && kStart < wEnd;
    });
    if (!overlapsEarlier) kept.push(w);
  }
  return kept;
};

export interface BuildActivityStepsAllocationV1Input {
  /** Resolved day total steps from {@link DailyActivityFacts.steps}. */
  totalSteps: number | undefined;
  /** Day's canonical workout events (NOT strength_workout events). */
  workoutEvents: WorkoutCanonicalEvent[];
}

export function buildActivityStepsAllocationV1(
  input: BuildActivityStepsAllocationV1Input,
): ActivityStepsAllocationV1 | undefined {
  const { totalSteps, workoutEvents } = input;

  if (!isFiniteNonNegativeNumber(totalSteps)) return undefined;
  const totalStepsInt = normalizeToInteger(totalSteps);
  if (!isFiniteNonNegativeInteger(totalStepsInt)) return undefined;

  // Classify all workouts (cardio/strength only contribute; "other"/unclassified excluded).
  const classifiedWorkouts: { event: WorkoutCanonicalEvent; classification: WorkoutClass }[] = [];
  for (const event of workoutEvents) {
    if (event.kind !== "workout") continue;
    const klass = classifyWorkoutSportForDailyFactsRollup(event.sport);
    if (klass === "cardio" || klass === "strength") {
      classifiedWorkouts.push({ event, classification: klass });
    }
  }

  // Strict fail-closed: classified workouts exist but none carry real step data → omit.
  if (classifiedWorkouts.length > 0) {
    const anyWithSteps = classifiedWorkouts.some(({ event }) =>
      isFiniteNonNegativeNumber(event.steps),
    );
    if (!anyWithSteps) return undefined;
  }

  // Attribute only workouts whose steps is a finite non-negative number; normalize to integers.
  const attributed: AttributedWorkout[] = classifiedWorkouts
    .filter(({ event }) => isFiniteNonNegativeNumber(event.steps))
    .map(({ event, classification }) => ({
      id: event.id,
      start: event.start,
      end: event.end,
      classification,
      steps: normalizeToInteger(event.steps as number),
    }));

  const deduped = dropOverlapsKeepEarlier(attributed);

  let cardioSteps = 0;
  let strengthSteps = 0;
  let cardioContributed = false;
  let strengthContributed = false;
  let anyWorkoutStepsContributed = false;

  for (const w of deduped) {
    if (!isFiniteNonNegativeInteger(w.steps)) return undefined;
    if (w.classification === "cardio") {
      cardioSteps += w.steps;
      if (w.steps > 0) cardioContributed = true;
    } else if (w.classification === "strength") {
      strengthSteps += w.steps;
      if (w.steps > 0) strengthContributed = true;
    }
    anyWorkoutStepsContributed = true;
  }

  // If after overlap resolution we have no attributable workouts but classified ones existed,
  // we cannot honestly compute the partition.
  if (classifiedWorkouts.length > 0 && !anyWorkoutStepsContributed) return undefined;

  // Enforce the partition invariant pre-derivation: workout steps cannot exceed the day total.
  if (cardioSteps + strengthSteps > totalStepsInt) return undefined;

  const neatSteps = totalStepsInt - cardioSteps - strengthSteps;

  if (
    !isFiniteNonNegativeInteger(neatSteps) ||
    !isFiniteNonNegativeInteger(cardioSteps) ||
    !isFiniteNonNegativeInteger(strengthSteps)
  ) {
    return undefined;
  }
  if (neatSteps + strengthSteps + cardioSteps !== totalStepsInt) return undefined;

  const inputsUsed: string[] = ["activity.steps"];
  if (anyWorkoutStepsContributed) inputsUsed.push("workout.steps");
  if (cardioContributed) inputsUsed.push("workout.classifiedCardio");
  if (strengthContributed) inputsUsed.push("workout.classifiedStrength");

  return {
    modelVersion: "activity_steps_allocation_v1",
    neatSteps,
    strengthSteps,
    cardioSteps,
    inputsUsed,
    inputsMissing: [],
  };
}
