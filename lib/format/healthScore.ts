// lib/format/healthScore.ts
// Phase 1.5 Sprint 2 — Neutral display labels (no interpretation)
import type { HealthScoreTier, HealthScoreStatus } from "@/lib/contracts";

export function formatHealthScoreTier(tier: HealthScoreTier): string {
  switch (tier) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "poor":
      return "Poor";
    default:
      return String(tier);
  }
}

export function formatHealthScoreStatus(status: HealthScoreStatus): string {
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

/** Format missing[] for display (e.g. "Missing: sleep, steps"). */
export function formatMissingList(missing: string[]): string {
  if (missing.length === 0) return "";
  return `Missing: ${missing.join(", ")}`;
}
