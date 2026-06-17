import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  cardioSessionDistanceMeters,
  cardioSessionDistanceMiles,
  filterCardioHistoryRowsDedupeOverlappingOther,
  isDisplayableCardioHistorySession,
  resolveCardioSessionDisplayName,
} from "@/lib/data/workouts/cardioSessionPresentation";
import {
  formatAvgPaceMinPerMileLabel,
  formatTypicalStrengthVolumeLabel,
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import {
  buildWorkoutSessionSurfaceModel,
  pickJournalSummaryForStrengthSession,
  pickWorkoutOverrideForSession,
} from "@/lib/data/workouts/workoutSessionSurface";
import {
  reconcileWorkoutSessionsForDay,
  type ReconciledWorkoutSession,
} from "@/lib/data/workouts/workoutSessionReconciliation";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import type { ManualWorkoutDaySummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import { formatMetricLogDateFromDayKey } from "@/lib/ui/logs/formatMetricLogDate";
import type { DayKey } from "@/lib/ui/calendar/types";

export type WorkoutLogRow = {
  key: string;
  day: DayKey;
  session: ReconciledWorkoutSession;
  dateLabel: string;
  primaryMetric: string;
  secondaryMetric: string;
  accessibilityLabel: string;
};

type WorkoutLogDomain = "strength" | "cardio";

type BuildWorkoutLogRowsArgs = {
  days: readonly WorkoutCalendarDayLike[];
  domain: WorkoutLogDomain;
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId: Record<string, string | undefined>;
  manualWorkoutSummaries?: readonly ManualWorkoutDaySummary[];
};

function countJournalSets(summary: ManualWorkoutDaySummary | null): number {
  if (summary == null) return 0;
  let n = 0;
  for (const ex of summary.exercises) n += ex.sets.length;
  return n;
}

function formatMilesSegment(miles: number): string {
  const nearestInt = Math.round(miles);
  if (Math.abs(miles - nearestInt) < 0.05) return `${nearestInt} mi`;
  return `${(Math.round(miles * 10) / 10).toFixed(1)} mi`;
}

export function formatStrengthLogSecondaryMetric(args: {
  durationMinutes: number | null;
  journalSummary: ManualWorkoutDaySummary | null;
}): string {
  const parts: string[] = [];
  const duration = formatWorkoutDurationLabel(args.durationMinutes);
  if (duration !== "—") parts.push(duration);
  const setCount = countJournalSets(args.journalSummary);
  if (setCount > 0) parts.push(`${setCount} set${setCount === 1 ? "" : "s"}`);
  const volumeLabel = formatTypicalStrengthVolumeLabel(args.journalSummary?.totalVolume ?? null);
  if (volumeLabel !== "—") parts.push(volumeLabel);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function formatCardioLogSecondaryMetric(args: {
  session: ReconciledWorkoutSession;
  durationMinutes: number | null;
}): string {
  const parts: string[] = [];
  const miles = cardioSessionDistanceMiles(args.session);
  if (miles != null && Number.isFinite(miles) && miles > 0) {
    parts.push(formatMilesSegment(miles));
  }
  const duration = formatWorkoutDurationLabel(args.durationMinutes);
  if (duration !== "—") parts.push(duration);
  const pace = formatAvgPaceMinPerMileLabel(
    cardioSessionDistanceMeters(args.session),
    args.durationMinutes,
  );
  if (pace !== "—") parts.push(pace.replace(" /mi", "/mi"));
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function buildSessionRow(args: {
  day: DayKey;
  session: ReconciledWorkoutSession;
  domain: WorkoutLogDomain;
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId: Record<string, string | undefined>;
  manualWorkoutSummaries: readonly ManualWorkoutDaySummary[];
}): WorkoutLogRow {
  const journalSummary =
    args.domain === "strength"
      ? pickJournalSummaryForStrengthSession(args.day, args.session, args.manualWorkoutSummaries)
      : null;
  const surface = buildWorkoutSessionSurfaceModel(
    args.session,
    args.overridesByWorkoutId,
    args.domain,
    journalSummary,
    args.durableTitlesByWorkoutId,
  );
  const sessionOverride = pickWorkoutOverrideForSession(args.session, args.overridesByWorkoutId);
  const resolvedMetrics = resolveWorkoutDisplay(
    surface.metricsWorkout,
    sessionOverride ?? args.overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
  );
  const durationMinutes = resolveWorkoutDisplayDurationMinutes({
    overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
    sessionDurationMinutes: null,
    fallbackWorkoutDurationMinutes: surface.metricsWorkout.durationMinutes ?? args.session.durationMinutes,
  });
  const primaryMetric =
    args.domain === "cardio"
      ? resolveCardioSessionDisplayName(
          args.session,
          args.overridesByWorkoutId,
          args.durableTitlesByWorkoutId,
        )
      : surface.displayTitle;
  const secondaryMetric =
    args.domain === "cardio"
      ? formatCardioLogSecondaryMetric({ session: args.session, durationMinutes })
      : formatStrengthLogSecondaryMetric({ durationMinutes, journalSummary });
  const dateLabel = formatMetricLogDateFromDayKey(args.day);
  return {
    key: `${args.day}:${args.session.id}`,
    day: args.day,
    session: args.session,
    dateLabel,
    primaryMetric,
    secondaryMetric,
    accessibilityLabel: `${dateLabel}. ${primaryMetric}. ${secondaryMetric}`,
  };
}

export function buildWorkoutLogRows(args: BuildWorkoutLogRowsArgs): WorkoutLogRow[] {
  const manualSummaries = args.manualWorkoutSummaries ?? [];
  type SessionRef = { key: string; day: DayKey; session: ReconciledWorkoutSession };
  const sessionRefs: SessionRef[] = [];

  for (const d of args.days) {
    const sessions = reconcileWorkoutSessionsForDay(d.day, d.workouts);
    for (const session of sessions) {
      if (args.domain === "cardio" && !isDisplayableCardioHistorySession(session)) continue;
      sessionRefs.push({
        key: `${d.day}:${session.id}`,
        day: d.day as DayKey,
        session,
      });
    }
  }

  sessionRefs.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? 1 : -1;
    const aStart = a.session.start ?? "";
    const bStart = b.session.start ?? "";
    if (aStart === bStart) return b.session.id.localeCompare(a.session.id);
    return bStart.localeCompare(aStart);
  });

  const filteredRefs =
    args.domain === "cardio"
      ? filterCardioHistoryRowsDedupeOverlappingOther(sessionRefs)
      : sessionRefs;

  return filteredRefs.map((ref) =>
    buildSessionRow({
      day: ref.day,
      session: ref.session,
      domain: args.domain,
      overridesByWorkoutId: args.overridesByWorkoutId,
      durableTitlesByWorkoutId: args.durableTitlesByWorkoutId,
      manualWorkoutSummaries: manualSummaries,
    }),
  );
}
