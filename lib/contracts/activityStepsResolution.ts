/**
 * Deterministic rules for collapsing multiple `kind: "steps"` canonical events for one calendar day
 * into a single display / daily-facts scalar (avoids double-counting Apple Health + manual, etc.).
 *
 * Policy:
 * - Apple-class (`apple_health` / `healthkit`): first collapse rows that share the same
 *   {@link appleStepsStableIdentity} (payload `sourceSampleId` / aliases, else canonical `id`).
 *   Within each identity, keep the latest authoritative instant (`updatedAt` then `createdAt`);
 *   ties break by lexicographic `id` (never by step magnitude).
 *   Then pick a single daily scalar row from the per-identity representatives (same ordering).
 * - Else if exactly one valid steps event, it wins.
 * - Else multiple non–Apple events: latest by timestamp ordering; ties break by lexicographic `id` only.
 */

import { isAppleHealthBodyReadSourceId } from "./bodyReadSources";

export type ActivityStepsCanonicalLike = {
  readonly id: string;
  readonly sourceId: string;
  readonly steps: number;
  /** Stable logical sample id from raw payload when present; else identity falls back to `id`. */
  readonly sourceSampleId?: string | null;
  readonly distanceKm?: number | null;
  readonly moveMinutes?: number | null;
  /** Lexicographic ISO timestamps from canonical events (raw `receivedAt` at write time). */
  readonly updatedAt?: string;
  readonly createdAt?: string;
};

function isValidSteps(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function authoritativeInstant(e: ActivityStepsCanonicalLike): string {
  return (e.updatedAt ?? e.createdAt ?? "") as string;
}

/** Newer ISO first; empty timestamps sort last. */
function compareByAuthoritativeTimeDesc(a: ActivityStepsCanonicalLike, b: ActivityStepsCanonicalLike): number {
  const ta = authoritativeInstant(a);
  const tb = authoritativeInstant(b);
  if (ta !== tb) return tb.localeCompare(ta);
  return 0;
}

/** One physical sample / ingest row: explicit Apple id, else one canonical Firestore row. */
export function appleStepsStableIdentity(e: ActivityStepsCanonicalLike): string {
  const s = e.sourceSampleId;
  if (typeof s === "string" && s.trim().length > 0) return s.trim();
  return e.id;
}

function pickAuthoritativeWithinIdentity(
  prev: ActivityStepsCanonicalLike,
  incoming: ActivityStepsCanonicalLike,
): ActivityStepsCanonicalLike {
  const cmp = compareByAuthoritativeTimeDesc(incoming, prev);
  if (cmp < 0) return incoming;
  if (cmp > 0) return prev;
  return incoming.id.localeCompare(prev.id) < 0 ? incoming : prev;
}

function dedupeAppleStepsByStableIdentity(
  apple: readonly ActivityStepsCanonicalLike[],
): ActivityStepsCanonicalLike[] {
  const byKey = new Map<string, ActivityStepsCanonicalLike>();
  for (const e of apple) {
    const key = appleStepsStableIdentity(e);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, e);
      continue;
    }
    byKey.set(key, pickAuthoritativeWithinIdentity(prev, e));
  }
  return [...byKey.values()];
}

function pickSingleContributing(valid: readonly ActivityStepsCanonicalLike[]): readonly ActivityStepsCanonicalLike[] {
  if (valid.length === 0) return [];
  if (valid.length === 1) return valid;
  const sorted = [...valid].sort((a, b) => {
    const t = compareByAuthoritativeTimeDesc(a, b);
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
  const top = sorted[0];
  return top != null ? [top] : [];
}

export function pickContributingStepEventsForDailyFacts(
  events: readonly ActivityStepsCanonicalLike[],
): readonly ActivityStepsCanonicalLike[] {
  const valid = events.filter((e) => isValidSteps(e.steps));
  if (valid.length === 0) return [];
  const apple = valid.filter((e) => isAppleHealthBodyReadSourceId(e.sourceId));
  if (apple.length > 0) {
    const perIdentity = dedupeAppleStepsByStableIdentity(apple);
    return pickSingleContributing(perIdentity);
  }
  return pickSingleContributing(valid);
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
