// lib/data/program/distributeProgrammingVolume.ts
/**
 * Distribution rules for the Programming Engine (steps 6, 8, 9): per-muscle weekly frequency and
 * the training-day split structure. Pure data + pure functions only.
 *
 * SCIENTIFIC INTENT:
 *  - Frequency increases with more training days and with higher weekly volume.
 *  - No muscle should exceed ~MAX_SETS_PER_SESSION hard sets in a single session when avoidable;
 *    frequency is raised to keep per-session sets in range (capped by available training days).
 *  - Training days change distribution, not total volume.
 */
import { weeklySplitDayId } from "@/lib/data/program/workoutProgramDesignOptions";
import type { ProgrammingSplitDay } from "@/lib/data/program/programmingEngineTypes";

/** Target ceiling for hard sets per muscle in a single session (the "~8–10" guidance). */
export const MAX_SETS_PER_SESSION = 9;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Weekly training frequency for a muscle group given its weekly sets and the program's training
 * days. Untrained muscles (0 sets) get frequency 0. Otherwise frequency is at least enough to keep
 * per-session sets ≤ {@link MAX_SETS_PER_SESSION}, lifted to a days-based baseline (≥2 on 5–6 day
 * programs so higher days mean higher frequency), and capped at the available training days.
 */
export function frequencyForMuscle(weeklySets: number, trainingDays: number): number {
  if (weeklySets <= 0) return 0;
  const byVolume = Math.ceil(weeklySets / MAX_SETS_PER_SESSION);
  const daysBaseline = trainingDays >= 5 ? 2 : 1;
  return clamp(Math.max(byVolume, daysBaseline), 1, trainingDays);
}

/**
 * Default training-day names are neutral ("Day 1", "Day 2", …). The engine guides STRUCTURE
 * (how many days), not a prescriptive split label — the user/creator renames each day to match
 * their plan on the Weekly Split page, and those custom names persist in the draft store.
 */
export function getWeeklySplitDayNames(trainingDays: number): readonly string[] {
  if (trainingDays <= 0) return [];
  return Array.from({ length: trainingDays }, (_unused, index) => `Day ${index + 1}`);
}

/**
 * Build the weekly-split day list, applying any manual name overrides (keyed by day id). A day with
 * an override is marked source "manual"; otherwise "engine".
 */
export function buildProgrammingSplitDays(
  trainingDays: number,
  nameOverrides: Record<string, string> = {},
): ProgrammingSplitDay[] {
  return getWeeklySplitDayNames(trainingDays).map((generatedName, index) => {
    const id = weeklySplitDayId(index + 1);
    const override = nameOverrides[id];
    const hasOverride = typeof override === "string";
    return {
      id,
      name: hasOverride ? override : generatedName,
      source: hasOverride ? "manual" : "engine",
    };
  });
}
