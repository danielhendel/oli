// lib/data/dash/dashRecapViewModel.ts
// Dash Recap: DailyFacts + workout day summary cardio; optional neutral placement bars (not interpretation).
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import {
  DASH_RECAP_DISPLAY_PLACEMENT_CAPS,
  dashRecapPlacementMarker01,
} from "@/lib/data/dash/dashRecapDisplayPlacement";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";

/** Same empty sentinel as Body Composition overview numeric gaps. */
export const DASH_RECAP_VALUE_PLACEHOLDER = "—" as const;

export type DashRecapRowId =
  | "weight"
  | "sleep"
  | "steps"
  | "strengthWorkouts"
  | "cardioSessions"
  | "calories";

/**
 * `placement`: marker along shared 5-segment track for **visual scale only** (see dashRecapDisplayPlacement).
 * `none`: no bar (missing data, or weight — no repo-safe neutral scale without user context).
 */
export type DashRecapRowBar = { kind: "none" } | { kind: "placement"; markerPosition01: number };

export type DashRecapRow = {
  id: DashRecapRowId;
  label: string;
  valueText: string;
  isPlaceholder: boolean;
  bar: DashRecapRowBar;
};

export type DashRecapViewModel =
  | { kind: "loading" }
  | {
      kind: "error";
      message: string;
      requestId: string | null;
      retry: () => void;
    }
  | {
      kind: "missing_doc";
      dayKey: string;
      rows: readonly DashRecapRow[];
    }
  | {
      kind: "empty";
      dayKey: string;
      rows: readonly DashRecapRow[];
    }
  | {
      kind: "ready";
      dayKey: string;
      rows: readonly DashRecapRow[];
    };

const ROW_LABELS: Record<DashRecapRowId, string> = {
  weight: "Weight",
  sleep: "Sleep",
  steps: "Steps",
  strengthWorkouts: "Strength Workouts",
  cardioSessions: "Cardio Sessions",
  calories: "Calories",
};

function row(
  id: DashRecapRowId,
  valueText: string,
  isPlaceholder: boolean,
  bar: DashRecapRowBar,
): DashRecapRow {
  return { id, label: ROW_LABELS[id], valueText, isPlaceholder, bar };
}

const FACT_ROW_IDS = ["weight", "sleep", "steps", "strengthWorkouts", "calories"] as const;

/** DailyFacts slice placeholders only (cardio comes from workout day summary merge). */
export function buildDashRecapPlaceholderRows(): DashRecapRow[] {
  return FACT_ROW_IDS.map((id) => row(id, DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" }));
}

export type DashRecapCardioSessionsMerge =
  | { kind: "ready"; count: number }
  | { kind: "unavailable" };

/**
 * Inserts Cardio Sessions immediately before Calories. Count uses workout day summary
 * `cardioSessionCount` (overview Cardio tab; see `WorkoutDaySummaryItemDto`).
 */
export function mergeCardioSessionsIntoDashRecapRows(
  factRows: readonly DashRecapRow[],
  cardio: DashRecapCardioSessionsMerge,
): DashRecapRow[] {
  const calIdx = factRows.findIndex((r) => r.id === "calories");
  const cardioRow: DashRecapRow =
    cardio.kind === "ready"
      ? row("cardioSessions", `${cardio.count}`, false, {
          kind: "placement",
          markerPosition01: dashRecapPlacementMarker01(
            cardio.count,
            DASH_RECAP_DISPLAY_PLACEMENT_CAPS.sessionCount,
          ),
        })
      : row("cardioSessions", DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" });
  if (calIdx < 0) {
    return [...factRows, cardioRow];
  }
  return [...factRows.slice(0, calIdx), cardioRow, ...factRows.slice(calIdx)];
}

function formatSteps(steps: number): string {
  return `${Math.round(steps)}`;
}

function formatCalories(kcal: number): string {
  return `${Math.round(kcal)}`;
}

/**
 * Maps DailyFacts scalars to recap rows. Absent optional slices → placeholder per metric.
 * Weight: numeric display only — **no** placement bar (no repo-neutral scale without profile context).
 */
export function buildDashRecapRows(input: {
  facts: DailyFactsDto;
  massUnit: "kg" | "lb";
}): DashRecapRow[] {
  const { facts, massUnit } = input;

  const weightKg = facts.body?.weightKg;
  const weightRow =
    typeof weightKg === "number" && Number.isFinite(weightKg)
      ? row("weight", formatBodyWeight(weightKg, massUnit), false, { kind: "none" })
      : row("weight", DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" });

  const sleepMin = facts.sleep?.totalMinutes;
  const sleepRow =
    typeof sleepMin === "number" && Number.isFinite(sleepMin) && sleepMin >= 0
      ? row("sleep", formatSleepDurationMinutes(sleepMin), false, {
          kind: "placement",
          markerPosition01: dashRecapPlacementMarker01(sleepMin, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.sleepMinutes),
        })
      : row("sleep", DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" });

  const steps = facts.activity?.steps;
  const stepsRow =
    typeof steps === "number" && Number.isFinite(steps) && steps >= 0
      ? row("steps", formatSteps(steps), false, {
          kind: "placement",
          markerPosition01: dashRecapPlacementMarker01(steps, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps),
        })
      : row("steps", DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" });

  const wc = facts.strength?.workoutsCount;
  const strengthRow =
    typeof wc === "number" && Number.isFinite(wc) && wc >= 0
      ? row("strengthWorkouts", `${wc}`, false, {
          kind: "placement",
          markerPosition01: dashRecapPlacementMarker01(wc, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.sessionCount),
        })
      : row("strengthWorkouts", DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" });

  const kcal = facts.nutrition?.totalKcal;
  const calRow =
    typeof kcal === "number" && Number.isFinite(kcal) && kcal >= 0
      ? row("calories", formatCalories(kcal), false, {
          kind: "placement",
          markerPosition01: dashRecapPlacementMarker01(kcal, DASH_RECAP_DISPLAY_PLACEMENT_CAPS.caloriesKcal),
        })
      : row("calories", DASH_RECAP_VALUE_PLACEHOLDER, true, { kind: "none" });

  return [weightRow, sleepRow, stepsRow, strengthRow, calRow];
}

/** True when every DailyFacts-backed row is a placeholder (ignores cardio row). */
export function dashRecapRowsAllPlaceholders(rows: readonly DashRecapRow[]): boolean {
  const factRows = rows.filter((r) => r.id !== "cardioSessions");
  return factRows.length === FACT_ROW_IDS.length && factRows.every((r) => r.isPlaceholder);
}
