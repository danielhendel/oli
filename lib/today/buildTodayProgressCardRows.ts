import type { ScoreFact, TodayCommandModel, TodayTargetProgress } from "@/lib/today/types";
import {
  TODAY_PROGRESS_ROW_ORDER,
  todayProgressRowRoute,
  type TodayProgressRowId,
} from "@/lib/today/todayTargetRoutes";

export type TodayProgressCardRow = {
  id: TodayProgressRowId;
  label: string;
  displayValue: string;
  routeTarget: string;
};

const CARD_LABEL_BY_TARGET_ID: Partial<Record<TodayTargetProgress["id"], string>> = {
  workout: "Workout",
  calories: "Calories",
};

function formatWorkoutCardValue(target: TodayTargetProgress): string {
  if (target.status === "missing" && target.displayValue === "No workout scheduled") {
    return "\u2014";
  }
  if (target.status === "complete") {
    const count = target.current;
    if (count === 1) return "1 workout";
    if (typeof count === "number" && count > 1) return `${count} workouts`;
    return "Complete";
  }
  if (typeof target.current === "number" && target.current > 0) {
    return target.current === 1 ? "1 workout" : `${target.current} workouts`;
  }
  return "\u2014";
}

function formatOuraScore(fact: ScoreFact | null): string {
  if (fact == null || !Number.isFinite(fact.value)) return "\u2014";
  return String(Math.round(fact.value));
}

function cardDisplayValueForTarget(target: TodayTargetProgress): string {
  if (target.id === "workout") return formatWorkoutCardValue(target);
  return target.displayValue;
}

function cardLabelForTarget(target: TodayTargetProgress): string {
  return CARD_LABEL_BY_TARGET_ID[target.id] ?? target.label;
}

function buildRecoveryRows(readiness: TodayCommandModel["readiness"]): TodayProgressCardRow[] {
  return [
    {
      id: "sleep",
      label: "Sleep",
      displayValue: formatOuraScore(readiness.sleepScore),
      routeTarget: todayProgressRowRoute("sleep"),
    },
    {
      id: "readiness",
      label: "Readiness",
      displayValue: formatOuraScore(readiness.readinessScore),
      routeTarget: todayProgressRowRoute("readiness"),
    },
  ];
}

/** Compact Today’s Progress card rows — Dash summary only (no progress bars / sublines). */
export function buildTodayProgressCardRows(model: TodayCommandModel): TodayProgressCardRow[] {
  const targetById = new Map(model.targets.map((t) => [t.id, t]));
  const recoveryById = new Map(buildRecoveryRows(model.readiness).map((r) => [r.id, r]));

  return TODAY_PROGRESS_ROW_ORDER.map((id) => {
    if (id === "sleep" || id === "readiness") {
      return recoveryById.get(id)!;
    }
    const target = targetById.get(id)!;
    return {
      id,
      label: cardLabelForTarget(target),
      displayValue: cardDisplayValueForTarget(target),
      routeTarget: todayProgressRowRoute(id),
    };
  });
}
