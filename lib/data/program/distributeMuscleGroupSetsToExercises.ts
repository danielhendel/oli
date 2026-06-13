// lib/data/program/distributeMuscleGroupSetsToExercises.ts
/**
 * Exercise-count and set-distribution rules for the Program Builder exercise recommendation engine.
 * Pure functions only — no IO, no React. Same inputs ⇒ identical output.
 *
 * SCIENTIFIC INTENT (encoded from the feature spec):
 *  - Exercise count scales with weekly volume (more sets ⇒ more exercises, to vary the stimulus and
 *    spread fatigue across movements).
 *  - Within each volume band, prefer the smallest count that keeps any single slot at ≤ the target
 *    per-slot ceiling, so volume isn't dumped into one movement when it can be split.
 *  - Frequency nudges the count up (a muscle trained ≥2×/week gets ≥2 slots when its band allows),
 *    so weekly volume is spread across exposures.
 */

/** Target ceiling for working sets in a single exercise slot (the "~4–5" guidance). */
export const TARGET_MAX_SETS_PER_SLOT = 5;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** The [min, max] exercise-count band for a weekly set total (per the spec's volume table). */
function exerciseCountBand(weeklySets: number): [number, number] {
  if (weeklySets <= 0) return [0, 0];
  if (weeklySets <= 6) return [1, 1];
  if (weeklySets <= 12) return [2, 2];
  if (weeklySets <= 18) return [2, 3];
  return [3, 4];
}

/**
 * Recommended number of exercise slots for a muscle group.
 *
 * Volume bands (spec): 0→0, 1–6→1, 7–12→2, 13–18→2–3, 19+→3–4. Within a band we pick the smallest
 * count whose even split keeps each slot ≤ {@link TARGET_MAX_SETS_PER_SLOT}; if none can (very high
 * volume), we use the band maximum. Frequency then raises the count toward the number of weekly
 * exposures, capped to the band maximum so the volume table is always respected.
 */
export function recommendedExerciseCount(weeklySets: number, frequencyPerWeek: number): number {
  const [min, max] = exerciseCountBand(weeklySets);
  if (max === 0) return 0;

  let count = max;
  for (let c = min; c <= max; c += 1) {
    if (Math.ceil(weeklySets / c) <= TARGET_MAX_SETS_PER_SLOT) {
      count = c;
      break;
    }
  }

  const frequencyFloor = clamp(frequencyPerWeek, min, max);
  return clamp(Math.max(count, frequencyFloor), min, max);
}

/**
 * Split `weeklySets` across `count` slots as evenly as possible, allocating the remainder to the
 * earliest slots (so slots are non-increasing, e.g. 7 over 2 → [4, 3]; 13 over 3 → [5, 4, 4]).
 */
export function distributeMuscleGroupSetsToExercises(weeklySets: number, count: number): number[] {
  if (count <= 0 || weeklySets <= 0) return [];
  const base = Math.floor(weeklySets / count);
  const remainder = weeklySets % count;
  return Array.from({ length: count }, (_unused, index) => base + (index < remainder ? 1 : 0));
}
