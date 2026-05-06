import { useMemo } from "react";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useWorkoutDaySummaryForDay } from "@/lib/data/dash/useWorkoutDaySummaryForDay";
import { useLabResults } from "@/lib/data/useLabResults";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";

export type TodayHealthRecordRow = {
  id:
    | "activity"
    | "strength"
    | "cardio"
    | "weight"
    | "nutrition"
    | "sleep"
    | "recovery"
    | "labs"
    | "uploads";
  label: string;
  metric: string;
  value: string;
};

export type TodayHealthRecordVm = {
  dayKey: string;
  subtitle: string;
  rows: TodayHealthRecordRow[];
  subtleLoading: boolean;
  signedOut: boolean;
};

function formatTodaySubtitle(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
  const month = d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
  const day = d.toLocaleDateString(undefined, { day: "numeric", timeZone: "UTC" });
  return `${weekday}, ${month} ${day}`;
}

function isoToDayKey(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 10) return null;
  const candidate = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

export function useTodayHealthRecord(): TodayHealthRecordVm {
  const dayKey = getTodayDayKeyLocal();
  const subtitle = formatTodaySubtitle(dayKey);

  const dailyFacts = useDailyFacts(dayKey);
  const workoutSummary = useWorkoutDaySummaryForDay(dayKey);
  const labResults = useLabResults({ limit: 10 });
  const uploads = useUploadsPresence();
  const { state: prefState } = usePreferences();
  const massUnit = prefState.preferences.units.mass;

  return useMemo((): TodayHealthRecordVm => {
    const rows: TodayHealthRecordRow[] = [];

    const signedOut =
      dailyFacts.status === "partial" &&
      workoutSummary.status === "partial" &&
      labResults.status === "partial" &&
      uploads.status === "partial";

    if (dailyFacts.status === "ready") {
      const facts = dailyFacts.data;
      if (typeof facts.activity?.steps === "number") {
        rows.push({
          id: "activity",
          label: "Activity",
          metric: "Steps",
          value: facts.activity.steps.toLocaleString(),
        });
      }
      if (typeof facts.body?.weightKg === "number") {
        rows.push({
          id: "weight",
          label: "Weight",
          metric: "Body weight",
          value: formatBodyWeight(facts.body.weightKg, massUnit),
        });
      }
      if (typeof facts.nutrition?.mealCount === "number" && facts.nutrition.mealCount > 0) {
        rows.push({
          id: "nutrition",
          label: "Nutrition",
          metric: "Meals logged",
          value: `${facts.nutrition.mealCount}`,
        });
      } else if (typeof facts.nutrition?.totalKcal === "number" && facts.nutrition.totalKcal > 0) {
        rows.push({
          id: "nutrition",
          label: "Nutrition",
          metric: "Calories",
          value: `${Math.round(facts.nutrition.totalKcal).toLocaleString()} kcal`,
        });
      }
      if (typeof facts.sleep?.totalMinutes === "number" && facts.sleep.totalMinutes > 0) {
        rows.push({
          id: "sleep",
          label: "Sleep",
          metric: "Sleep duration",
          value: formatSleepDurationMinutes(facts.sleep.totalMinutes),
        });
      }
      if (typeof facts.recovery?.hrvRmssd === "number") {
        rows.push({
          id: "recovery",
          label: "Recovery",
          metric: "HRV",
          value: `${Math.round(facts.recovery.hrvRmssd)} ms`,
        });
      }
    }

    if (workoutSummary.status === "ready") {
      if (workoutSummary.data.strengthSessionCount > 0) {
        rows.push({
          id: "strength",
          label: "Strength",
          metric: workoutSummary.data.strengthSessionCount === 1 ? "Workout" : "Workouts",
          value: "Completed",
        });
      }
      if (workoutSummary.data.cardioSessionCount > 0) {
        rows.push({
          id: "cardio",
          label: "Cardio",
          metric: workoutSummary.data.cardioSessionCount === 1 ? "Session" : "Sessions",
          value: "Logged",
        });
      }
    }

    if (labResults.status === "ready") {
      const todaysLab = labResults.data.items.find((r) => isoToDayKey(r.collectedAt) === dayKey);
      if (todaysLab != null) {
        rows.push({
          id: "labs",
          label: "Labs",
          metric: todaysLab.biomarkers[0]?.name ?? "Lab result",
          value: "Logged",
        });
      }
    }

    if (uploads.status === "ready" && uploads.data.latest != null) {
      const uploadDay = isoToDayKey(uploads.data.latest.observedAt);
      if (uploadDay === dayKey) {
        rows.push({
          id: "uploads",
          label: "Uploads",
          metric: "Document",
          value: "Logged",
        });
      }
    }

    const subtleLoading =
      rows.length === 0 &&
      (dailyFacts.status === "partial" ||
        workoutSummary.status === "partial" ||
        labResults.status === "partial" ||
        uploads.status === "partial");

    return {
      dayKey,
      subtitle,
      rows,
      subtleLoading,
      signedOut,
    };
  }, [dayKey, subtitle, dailyFacts, workoutSummary, labResults, uploads, massUnit]);
}

