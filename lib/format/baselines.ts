// lib/format/baselines.ts
// Phase 1.5 Sprint 3 — Multi-Baseline display (UI-only, HealthScoreDoc fields only)
import type { HealthScoreDoc } from "@/lib/contracts";

/** Display content for General baseline panel (date, computedAt, status). */
export type GeneralBaselineContent = {
  date: string;
  computedAt: string;
  status: string;
};

/** Display content for Personal baseline panel (inputs used). */
export type PersonalBaselineContent = {
  historyDaysUsed: number;
  hasDailyFacts: boolean;
};

/** Display content for Optimization baseline panel (model/pipeline context). */
export type OptimizationBaselineContent = {
  modelVersion: string;
  pipelineVersion: number;
  schemaVersion: number;
};

function formatIsoToLocal(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function formatStatus(status: HealthScoreDoc["status"]): string {
  switch (status) {
    case "stable":
      return "Stable";
    case "attention_required":
      return "Attention required";
    case "insufficient_data":
      return "Insufficient data";
    default:
      return String(status);
  }
}

/** Derive General baseline display from HealthScoreDoc. */
export function getGeneralBaselineContent(doc: HealthScoreDoc): GeneralBaselineContent {
  return {
    date: doc.date,
    computedAt: formatIsoToLocal(doc.computedAt),
    status: formatStatus(doc.status),
  };
}

/** Derive Personal baseline display from HealthScoreDoc. */
export function getPersonalBaselineContent(doc: HealthScoreDoc): PersonalBaselineContent {
  return {
    historyDaysUsed: doc.inputs.historyDaysUsed,
    hasDailyFacts: doc.inputs.hasDailyFacts,
  };
}

/** Derive Optimization baseline display from HealthScoreDoc. */
export function getOptimizationBaselineContent(
  doc: HealthScoreDoc,
): OptimizationBaselineContent {
  return {
    modelVersion: doc.modelVersion,
    pipelineVersion: doc.pipelineVersion,
    schemaVersion: doc.schemaVersion,
  };
}
