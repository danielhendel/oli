// Pure adapter: Daily Timeline workout events → shared reconcileWorkoutSessionsCore → actions.
// No Firestore, no network. Matching uses the shared core (not title equality alone).

import type { CanonicalEventListItem } from "@oli/contracts";
import {
  familyFromWorkoutKind,
  reconcileWorkoutSessionsCore,
  type ReconcilableWorkoutRecord,
  type WorkoutSessionType,
} from "@/lib/domain/workouts/reconcileWorkoutSessionsCore";
import { resolveTimelineItemHref } from "@/lib/features/timeline/resolveTimelineItemHref";
import type { TimelineDayItem, TimelineSourceType } from "@/lib/features/timeline/types";

const ICONS: Record<"workout_strength" | "workout_cardio" | "workout", string> = {
  workout_strength: "barbell-outline",
  workout_cardio: "bicycle-outline",
  workout: "fitness-outline",
};

function durationMinutes(start: string, end: string): number | null {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
  return Math.max(1, Math.round((e - s) / 60_000));
}

function sourceTypeForSession(sessionType: WorkoutSessionType): TimelineSourceType {
  if (sessionType === "strength") return "workout_strength";
  if (sessionType === "cardio") return "workout_cardio";
  return "workout";
}

function toReconcilable(ev: CanonicalEventListItem): ReconcilableWorkoutRecord {
  return {
    id: ev.id,
    sourceId: ev.sourceId,
    rawKind: ev.kind,
    title: null,
    start: ev.start,
    end: ev.end,
    observedAt: ev.start,
    durationMinutes: durationMinutes(ev.start, ev.end),
    calories: null,
    family: familyFromWorkoutKind(ev.kind),
  };
}

/**
 * Reconcile workout / strength_workout canonical events for one day into unique
 * Daily Timeline action items. Matching manual/watch pairs become one action.
 */
export function buildReconciledDailyTimelineWorkoutItems(
  day: string,
  events: readonly CanonicalEventListItem[],
): TimelineDayItem[] {
  const candidates = events.filter(
    (ev) =>
      (ev.kind === "workout" || ev.kind === "strength_workout") &&
      Number.isFinite(Date.parse(ev.start)),
  );
  if (candidates.length === 0) return [];

  const byId = new Map(candidates.map((ev) => [ev.id, ev]));
  const sessions = reconcileWorkoutSessionsCore(day, candidates.map(toReconcilable));

  return sessions.map((session) => {
    const sourceType = sourceTypeForSession(session.sessionType);
    const primary =
      session.members.find((m) => m.sourceId === "manual") ?? session.members[0]!;
    const primaryEvent = byId.get(primary.id) ?? candidates[0]!;
    const timestamp = session.start ?? primaryEvent.start;
    const title = session.title;
    const href = resolveTimelineItemHref({
      sourceType,
      day,
      canonicalEventId: primary.id,
    });
    return {
      id: session.id,
      day,
      timestamp,
      sortKey: `${timestamp}#${session.id}`,
      title,
      sourceType,
      sourceId: primary.sourceId,
      icon: ICONS[sourceType as keyof typeof ICONS],
      href,
      isPassive: primary.sourceId !== "manual",
      accessibilityLabel: title,
    };
  });
}

/** True when a Daily Timeline action is workout-like (must go through reconciliation). */
export function isDailyTimelineWorkoutAction(
  item: Pick<TimelineDayItem, "sourceType">,
): boolean {
  return (
    item.sourceType === "workout" ||
    item.sourceType === "workout_strength" ||
    item.sourceType === "workout_cardio"
  );
}
