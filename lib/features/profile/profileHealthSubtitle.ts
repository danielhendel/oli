// lib/features/profile/profileHealthSubtitle.ts
// Collapsed-row summaries for health record categories — uses DailyFacts + labs + uploads + failures only.

import type { DailyFactsDto } from "@/lib/contracts";
import { formatSleepMinutes } from "@/lib/metrics/metricUnits";
import type { HealthRecordCategory } from "@/lib/features/profile/healthRecordCategories";

export const FALLBACK_NO_DATA = "No data in record";
export const FALLBACK_NO_UPLOADS = "No uploads";
export const FALLBACK_NONE = "None";
export const FALLBACK_MISSING = "Not yet available in Oli";

export type HealthSubtitleHooks = {
  dailyFacts:
    | { status: "error" }
    | { status: "partial" | "missing" }
    | { status: "ready"; data: DailyFactsDto };
  labResults: { status: string; data?: { items: unknown[] } };
  uploads: { status: string; data?: { count: number } };
  failures: { status: string; data?: { items: unknown[] } };
};

export function getHealthRecordCategorySubtitle(cat: HealthRecordCategory, h: HealthSubtitleHooks): string {
  const { dailyFacts, labResults, uploads, failures } = h;

  if (cat.recordState === "Missing") return FALLBACK_MISSING;

  switch (cat.id) {
    case "body": {
      if (dailyFacts.status === "error") return "—";
      if (dailyFacts.status !== "ready" || !dailyFacts.data.body?.weightKg) return FALLBACK_NO_DATA;
      const b = dailyFacts.data.body;
      const w = `${b.weightKg} kg`;
      if (b.bodyFatPercent != null) return `${w}, ${b.bodyFatPercent}% fat`;
      return w;
    }
    case "cardiovascular":
    case "cardio-activity": {
      if (dailyFacts.status === "error") return "—";
      if (dailyFacts.status !== "ready") return FALLBACK_NO_DATA;
      const hrv = dailyFacts.data?.recovery?.hrvRmssd;
      const steps = dailyFacts.data?.activity?.steps;
      const moveMinutes = dailyFacts.data?.activity?.moveMinutes;
      const parts: string[] = [];
      if (hrv != null) parts.push(`HRV ${Math.round(hrv)} ms`);
      if (steps != null) parts.push(`${steps.toLocaleString()} steps`);
      if (moveMinutes != null) parts.push(`${moveMinutes} min`);
      return parts.length ? parts.join(" · ") : FALLBACK_NO_DATA;
    }
    case "musculoskeletal": {
      if (dailyFacts.status === "error") return "—";
      if (dailyFacts.status !== "ready" || !dailyFacts.data.strength) return FALLBACK_NO_DATA;
      const s = dailyFacts.data.strength;
      if (s.workoutsCount > 0) return `${s.workoutsCount} workout${s.workoutsCount !== 1 ? "s" : ""}`;
      if (s.totalSets > 0) return `${s.totalSets} sets`;
      return FALLBACK_NO_DATA;
    }
    case "sleep": {
      if (dailyFacts.status === "error") return "—";
      if (dailyFacts.status !== "ready") return FALLBACK_NO_DATA;
      const totalMinutes = dailyFacts.data?.sleep?.totalMinutes;
      if (totalMinutes != null) return formatSleepMinutes(totalMinutes);
      return FALLBACK_NO_DATA;
    }
    case "nutrition": {
      if (dailyFacts.status === "error") return "—";
      if (dailyFacts.status !== "ready" || !dailyFacts.data.nutrition) return FALLBACK_NO_DATA;
      const n = dailyFacts.data.nutrition;
      if (n.totalKcal != null) return `${n.totalKcal.toLocaleString()} kcal`;
      if (n.proteinG != null) return `${n.proteinG} g protein`;
      return FALLBACK_NO_DATA;
    }
    case "recovery": {
      if (dailyFacts.status === "error") return "—";
      if (dailyFacts.status !== "ready" || dailyFacts.data.recovery?.hrvRmssd == null) return FALLBACK_NO_DATA;
      return `HRV ${Math.round(dailyFacts.data.recovery.hrvRmssd)} ms`;
    }
    case "labs": {
      if (labResults.status === "error") return "—";
      if (labResults.status !== "ready") return FALLBACK_NO_DATA;
      const count = labResults.data?.items?.length ?? 0;
      return count === 0 ? FALLBACK_NO_DATA : `${count} result${count !== 1 ? "s" : ""}`;
    }
    case "imaging": {
      if (uploads.status === "error") return "—";
      if (uploads.status !== "ready") return FALLBACK_NO_UPLOADS;
      const count = uploads.data?.count ?? 0;
      return count === 0 ? FALLBACK_NO_UPLOADS : `${count} upload${count !== 1 ? "s" : ""}`;
    }
    case "data-quality": {
      if (failures.status === "error") return "—";
      if (failures.status !== "ready") return FALLBACK_NONE;
      const count = failures.data?.items?.length ?? 0;
      return count === 0 ? FALLBACK_NONE : `${count} issue${count !== 1 ? "s" : ""}`;
    }
    default:
      return FALLBACK_NO_DATA;
  }
}

/** Baseline / range line when present in DailyFacts (no invented ranges). */
export function getCategoryBaselineLabel(catId: string, dailyFacts: HealthSubtitleHooks["dailyFacts"]): string | null {
  if (dailyFacts.status !== "ready") return null;
  const r = dailyFacts.data.recovery;
  if (!r) return null;
  if (catId === "recovery" || catId === "cardiovascular") {
    if (typeof r.hrvRmssdBaseline === "number") {
      return `Baseline HRV ${Math.round(r.hrvRmssdBaseline)} ms`;
    }
    if (typeof r.hrvRmssdDeviation === "number") {
      return `HRV vs baseline ${Math.round(r.hrvRmssdDeviation)}%`;
    }
  }
  return null;
}
