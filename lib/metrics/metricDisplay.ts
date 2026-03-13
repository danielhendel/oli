// lib/metrics/metricDisplay.ts
// Metric value formatting, numeric extraction, and bar progress logic (reusable across Manage and future metric pages).

import { METRIC_BAR_RANGES } from "./metricRanges";
import { formatSleepMinutes, formatSteps, formatGrams } from "./metricUnits";

export type MetricSource =
  | { type: "dailyFacts"; path: string }
  | { type: "labResults"; path: string }
  | { type: "uploadsPresence"; path: string }
  | { type: "failuresRange"; path: string };

export type MetricDataContext = {
  dailyFacts: { status: string; data?: unknown };
  labResults: { status: string; data?: unknown };
  uploads: { status: string; data?: unknown };
  failures: { status: string; data?: unknown };
};

export type MetricForDisplay = {
  id: string;
  source: MetricSource | null;
  supportedNow: boolean;
};

const DASH = "—";

/**
 * Get a nested value from an object by dot-separated path.
 */
export function getNested(path: string, obj: unknown): unknown {
  if (!obj) return undefined;
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc == null) return undefined;
    if (typeof acc !== "object" || acc === null) return undefined;
    const next = (acc as Record<string, unknown>)[part];
    return next;
  }, obj);
}

/**
 * Compute bar progress (0–1) for a metric from its numeric value using METRIC_BAR_RANGES.
 * Returns null if no range is configured or range is invalid.
 */
export function getBarProgress(metricId: string, numericValue: number): number | null {
  const range = METRIC_BAR_RANGES[metricId];
  if (!range) return null;
  const { min, max, inverted } = range;
  if (max <= min) return null;
  let t = (numericValue - min) / (max - min);
  t = Math.max(0, Math.min(1, t));
  return inverted ? 1 - t : t;
}

/**
 * Extract raw numeric value for bar rendering, or null if not applicable.
 */
export function getMetricNumericForBar(
  metric: MetricForDisplay,
  context: MetricDataContext,
): number | null {
  if (!metric.supportedNow || !metric.source || !METRIC_BAR_RANGES[metric.id]) return null;
  const source = metric.source;
  let raw: unknown = null;
  if (source.type === "dailyFacts") {
    if (context.dailyFacts.status !== "ready" || !context.dailyFacts.data) return null;
    raw = getNested(source.path, context.dailyFacts.data);
  } else if (source.type === "labResults") {
    if (context.labResults.status !== "ready") return null;
    raw =
      metric.id === "lab-results-count"
        ? getNested(source.path, context.labResults.data)
        : null;
  } else if (source.type === "uploadsPresence") {
    if (context.uploads.status !== "ready") return null;
    raw = metric.id === "uploads" ? getNested(source.path, context.uploads.data) : null;
  } else if (source.type === "failuresRange") {
    if (context.failures.status !== "ready") return null;
    raw =
      metric.id === "open-issues" ? getNested(source.path, context.failures.data) : null;
  }
  if (raw == null || typeof raw !== "number") return null;
  return raw;
}

/**
 * Format a metric's display value from context (or "—" when missing/error/unsupported).
 */
export function formatMetricValue(
  metric: MetricForDisplay,
  context: MetricDataContext,
): string {
  if (!metric.supportedNow || !metric.source) {
    return DASH;
  }

  const source = metric.source;

  if (source.type === "dailyFacts") {
    if (context.dailyFacts.status === "error") return DASH;
    if (context.dailyFacts.status !== "ready") return DASH;
    const raw = getNested(source.path, context.dailyFacts.data);
    if (raw == null) return DASH;

    switch (metric.id) {
      case "weight":
        return `${raw as number} kg`;
      case "body-fat-percent":
        return `${raw as number}%`;
      case "sleep-duration":
        return formatSleepMinutes(raw as number);
      case "hrv":
      case "recovery-hrv":
        return `HRV ${Math.round(raw as number)} ms`;
      case "activity-minutes":
        return `${raw as number} min`;
      case "steps":
        return formatSteps(raw as number);
      case "calories":
        return `${(raw as number).toLocaleString()} kcal`;
      case "protein":
      case "carbs":
      case "fat":
        return formatGrams(raw as number);
      case "workouts-count":
      case "total-sets":
      case "total-reps": {
        const num = raw as number;
        return num > 0 ? String(num) : DASH;
      }
      case "training-volume": {
        const val = raw as { lb?: number; kg?: number } | undefined;
        if (!val) return DASH;
        if (val.kg != null) return `${val.kg} kg`;
        if (val.lb != null) return `${val.lb} lb`;
        return DASH;
      }
      case "hrv-baseline":
        return `${Math.round(raw as number)} ms`;
      case "hrv-deviation":
        return `${Math.round(raw as number)}%`;
      default:
        return String(raw);
    }
  }

  if (source.type === "labResults") {
    if (context.labResults.status === "error") return DASH;
    if (context.labResults.status !== "ready") return DASH;
    const raw = getNested(source.path, context.labResults.data);
    if (raw == null) return DASH;
    if (metric.id === "lab-results-count") {
      const count = raw as number;
      return count === 0 ? DASH : `${count} result${count !== 1 ? "s" : ""}`;
    }
    return String(raw);
  }

  if (source.type === "uploadsPresence") {
    if (context.uploads.status === "error") return DASH;
    if (context.uploads.status !== "ready") return DASH;
    const raw = getNested(source.path, context.uploads.data);
    if (raw == null) return DASH;
    if (metric.id === "uploads") {
      const count = raw as number;
      return count === 0 ? DASH : `${count} upload${count !== 1 ? "s" : ""}`;
    }
    if (metric.id === "latest-upload") {
      const iso = raw as string;
      if (!iso) return DASH;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return DASH;
      return d.toISOString().slice(0, 10);
    }
    return String(raw);
  }

  if (source.type === "failuresRange") {
    if (context.failures.status === "error") return DASH;
    if (context.failures.status !== "ready") return DASH;
    const raw = getNested(source.path, context.failures.data);
    if (raw == null) return DASH;
    if (metric.id === "open-issues") {
      const count = raw as number;
      return count === 0 ? DASH : `${count} issue${count !== 1 ? "s" : ""}`;
    }
    return String(raw);
  }

  return DASH;
}
