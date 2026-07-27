/**
 * Detect readiness-range responses that are structurally incompatible with
 * contributor history (Phase 2F-C1+).
 *
 * Pre-PR #201 APIs returned only { day, score, source }. That parses as "ready"
 * under the optional-contributors schema but yields zero pattern samples —
 * which must not be mislabeled as "Not enough data".
 *
 * Pure helper: no I/O, no logging of health values.
 */

import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";
import { READINESS_RANGE_CONTRIBUTOR_KEYS } from "@oli/contracts/ouraVendor";

/** Bump when the client history contract shape changes (invalidates warm cache). */
export const READINESS_CONTRIBUTOR_HISTORY_CACHE_CONTRACT = "contrib-v1" as const;

/**
 * True when the range payload can support contributor pattern windows.
 * Empty ranges are allowed (honest insufficient history later).
 * Scored days with zero contributor objects indicate a stale/incompatible API.
 */
export function readinessRangeSupportsContributorHistory(
  days: readonly OuraReadinessRangeDayDto[],
): boolean {
  if (days.length === 0) return true;

  let scoredDays = 0;
  let daysWithContributorObject = 0;
  let daysWithApprovedContributor = 0;

  for (const day of days) {
    if (typeof day.score === "number" && Number.isFinite(day.score)) {
      scoredDays += 1;
    }
    if (day.contributors != null && typeof day.contributors === "object") {
      daysWithContributorObject += 1;
      for (const key of READINESS_RANGE_CONTRIBUTOR_KEYS) {
        const v = day.contributors[key];
        if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100) {
          daysWithApprovedContributor += 1;
          break;
        }
      }
    }
  }

  // Sparse empty history: no scored days → cannot diagnose contract gap.
  if (scoredDays === 0) return true;

  // Stale pre-contributor range DTO: scores present, never any contributors.
  if (daysWithContributorObject === 0) return false;

  // Defensive: contributor objects present but none approved/valid.
  if (daysWithApprovedContributor === 0 && scoredDays >= 3) return false;

  return true;
}

export function readinessContributorHistoryUnavailableMessage(): string {
  return "Could not load readiness contributor history.";
}
