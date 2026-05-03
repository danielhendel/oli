import { collectStrengthOverviewTabSessions } from "@/lib/data/workouts/strengthOverviewCardModel";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  createEmptyStrengthTaxonomyMaps,
  countedNonWarmupSets,
  mergeManualExercisesIntoStrengthTaxonomyMaps,
} from "@/lib/data/workouts/strengthTaxonomySummaryAggregate";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import {
  buildWorkoutSessionSurfaceModel,
  pickWorkoutOverrideForSession,
  resolveStrengthSessionExerciseDisplay,
} from "@/lib/data/workouts/workoutSessionSurface";
import type { WorkoutOverride } from "@/lib/data/workouts/workoutOverrides";
import {
  formatWorkoutDurationLabel,
  resolveWorkoutDisplay,
  resolveWorkoutDisplayDurationMinutes,
} from "@/lib/data/workouts/workoutDisplay";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { ManualWorkoutDaySummary, ManualWorkoutExerciseSummary } from "@/lib/workouts/journal/manualWorkoutSummary";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Calendar-backed “scheduled / planned” strength sessions for this overview are not in the hydrated
 * workout calendar model yet. When a durable schedule exists in-repo, prefer showing “Scheduled Today”
 * only when no completed strength-tab session covers that day (mirroring HealthOS planned-workout rules).
 */
// scheduled: reserved — no fake schedule rows.

export type StrengthTodayCardModel =
  | {
      kind: "completed";
      pill: "Completed";
      /** Same display title as This Week rows ({@link buildWorkoutSessionSurfaceModel}). */
      primaryTitle: string;
      /** Right column on the title row, e.g. “43 min”. */
      durationLabel: string;
      /** Legacy field; Today card uses pill + title row instead of a duplicate eyebrow line. */
      sectionEyebrow: "Completed Today";
      /**
       * Summary under title: preferred `{sets} sets · {Muscle} focused` from journal/ingest exercises;
       * when none exist (e.g. Apple-only HK strength row), {@link STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE}.
       */
      subtitle: string;
    }
  | {
      kind: "rest";
      pill: "Rest";
      primaryTitle: "No workout today";
      durationLabel: "";
      subtitle: "Log a session when you train";
    };

/** Must stay aligned with weekly Strength aggregation tie-breaks (`weeklyStrengthCardModel`). */
const MUSCLE_GROUP_ORDER: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

function sumNonWarmupSetsAcrossExercises(exercises: readonly ManualWorkoutExerciseSummary[]): number {
  let n = 0;
  for (const ex of exercises) {
    n += countedNonWarmupSets(ex);
  }
  return n;
}

/** Primary training emphasis by non-warmup set counts attributed to taxonomic primary muscle (same rules as weekly rollups). */
function primaryMuscleFocusLabel(muscleSets: Map<MuscleGroup, number>): string | null {
  let bestGroup: MuscleGroup | null = null;
  let bestCount = -1;
  for (const [group, rawCount] of muscleSets) {
    const count = typeof rawCount === "number" && Number.isFinite(rawCount) ? rawCount : 0;
    if (count <= 0) continue;
    if (bestGroup == null) {
      bestGroup = group;
      bestCount = count;
      continue;
    }
    const ia = MUSCLE_GROUP_ORDER.indexOf(group);
    const ib = MUSCLE_GROUP_ORDER.indexOf(bestGroup);
    const better =
      count > bestCount || (count === bestCount && ia >= 0 && ib >= 0 && ia < ib);
    if (better) {
      bestGroup = group;
      bestCount = count;
    }
  }
  return bestGroup != null ? `${MUSCLE_GROUP_LABELS[bestGroup]} focused` : null;
}

/**
 * Session-local summary for Today card — journal exercises win, else ingest exercises on the action workout.
 * Does not duplicate duration (shown on the title row).
 */
export function buildStrengthTodayCompletedSummaryLine(
  journal: ManualWorkoutDaySummary | null,
  actionWorkout: WorkoutHistoryItem,
): string {
  const { exercises } = resolveStrengthSessionExerciseDisplay(journal, actionWorkout);
  const totalSets = sumNonWarmupSetsAcrossExercises(exercises);
  const maps = createEmptyStrengthTaxonomyMaps();
  mergeManualExercisesIntoStrengthTaxonomyMaps(maps, exercises);
  const focusLabel = primaryMuscleFocusLabel(maps.muscleSets);

  const setsPart = totalSets > 0 ? `${totalSets} set${totalSets === 1 ? "" : "s"}` : "";
  if (setsPart.length > 0 && focusLabel != null) return `${setsPart} · ${focusLabel}`;
  if (setsPart.length > 0) return setsPart;
  if (focusLabel != null) return focusLabel;
  return "";
}

/**
 * Shown when a completed strength session has duration/title but no hydrate-backed exercise rows
 * (no journal match and no ingest exercises), so sets/focus cannot be computed without inventing data.
 */
export const STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE = "Completed strength session";

/** Latest strength session by wall-clock start (fallback observedAt), tie-break id. */
export function pickLatestStrengthSessionToday(sessions: readonly ReconciledWorkoutSession[]): ReconciledWorkoutSession | null {
  if (sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => {
    const ka = a.start ?? a.workouts[0]?.observedAt ?? "";
    const kb = b.start ?? b.workouts[0]?.observedAt ?? "";
    const t = kb.localeCompare(ka);
    if (t !== 0) return t;
    return b.id.localeCompare(a.id);
  });
  return sorted[0] ?? null;
}

export function buildStrengthTodayCardModel(input: {
  strengthCalendarDays: readonly WorkoutCalendarDayLike[];
  todayDayKey: DayKey;
  manualJournalSummaryForToday?: ManualWorkoutDaySummary | null;
  overridesByWorkoutId: Record<string, WorkoutOverride | undefined>;
  durableTitlesByWorkoutId: Record<string, string | undefined>;
}): StrengthTodayCardModel {
  const sorted = [...input.strengthCalendarDays].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const row = sorted.find((d) => d.day === input.todayDayKey);
  const sessions = row ? collectStrengthOverviewTabSessions([{ day: input.todayDayKey, workouts: row.workouts }]) : [];
  const latest = pickLatestStrengthSessionToday(sessions);

  if (latest != null) {
    const journal = input.manualJournalSummaryForToday ?? null;
    const surface = buildWorkoutSessionSurfaceModel(
      latest,
      input.overridesByWorkoutId,
      "strength",
      journal,
      input.durableTitlesByWorkoutId,
    );
    const sessionOverride = pickWorkoutOverrideForSession(latest, input.overridesByWorkoutId);
    const resolvedMetrics = resolveWorkoutDisplay(
      surface.metricsWorkout,
      sessionOverride ?? input.overridesByWorkoutId[surface.metricsWorkout.id] ?? null,
    );
    const dm = resolveWorkoutDisplayDurationMinutes({
      overrideDurationMinutes: resolvedMetrics.displayDurationMinutes,
      sessionDurationMinutes: null,
      fallbackWorkoutDurationMinutes:
        surface.metricsWorkout.durationMinutes ?? latest.durationMinutes,
    });
    const durationLabel = formatWorkoutDurationLabel(dm);
    const exerciseSummaryLine = buildStrengthTodayCompletedSummaryLine(journal, surface.actionWorkout).trim();
    const subtitle =
      exerciseSummaryLine.length > 0 ? exerciseSummaryLine : STRENGTH_TODAY_COMPLETED_NO_DETAIL_SUBTITLE;
    return {
      kind: "completed",
      pill: "Completed",
      sectionEyebrow: "Completed Today",
      primaryTitle: surface.displayTitle,
      durationLabel,
      subtitle,
    };
  }

  return {
    kind: "rest",
    pill: "Rest",
    primaryTitle: "No workout today",
    durationLabel: "",
    subtitle: "Log a session when you train",
  };
}
