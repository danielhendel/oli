/**
 * Deterministic rules for collapsing multiple `kind: "steps"` canonical events for one calendar day
 * into a single display / daily-facts scalar (avoids double-counting Apple Health + manual, etc.).
 *
 * Policy (near-term):
 * - If any event is an Apple-class read (`apple_health` or `healthkit`, see {@link isAppleHealthBodyReadSourceId}),
 *   pick **one** Apple-class row (highest `steps`, then lexicographic `id`) and **ignore all non-Apple** sources for that day.
 * - Else if exactly one valid steps event, it wins.
 * - Else multiple non–Apple events: pick the single event with the highest `steps`; tie-break by `id` (lexicographic).
 */

import { isAppleHealthBodyReadSourceId } from "./bodyReadSources";

export type ActivityStepsCanonicalLike = {
  readonly id: string;
  readonly sourceId: string;
  readonly steps: number;
  readonly distanceKm?: number | null;
  readonly moveMinutes?: number | null;
};

function isValidSteps(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function pickContributingStepEventsForDailyFacts(
  events: readonly ActivityStepsCanonicalLike[],
): readonly ActivityStepsCanonicalLike[] {
  const valid = events.filter((e) => isValidSteps(e.steps));
  if (valid.length === 0) return [];
  const apple = valid.filter((e) => isAppleHealthBodyReadSourceId(e.sourceId));
  if (apple.length > 0) {
    if (apple.length === 1) return apple;
    const sorted = [...apple].sort((a, b) =>
      b.steps !== a.steps ? b.steps - a.steps : a.id.localeCompare(b.id),
    );
    const top = sorted[0];
    return top != null ? [top] : [];
  }
  if (valid.length === 1) return valid;
  const sorted = [...valid].sort((a, b) =>
    b.steps !== a.steps ? b.steps - a.steps : a.id.localeCompare(b.id),
  );
  const top = sorted[0];
  return top != null ? [top] : [];
}

export function resolvedStepsTotalFromContributing(
  contributing: readonly ActivityStepsCanonicalLike[],
): number {
  // Never sum multiple same-day vendors: collapse here so callers cannot double-count by
  // passing the full steps list (scalar DailyFacts.activity.steps is always one authority).
  const collapsed = pickContributingStepEventsForDailyFacts(contributing);
  if (collapsed.length === 0) return 0;
  return Math.round(collapsed[0]!.steps);
}
