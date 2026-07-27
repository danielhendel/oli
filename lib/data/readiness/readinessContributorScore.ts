/**
 * Readiness contributor-score normalization (Phase 2F-C1 foundation).
 *
 * Values are Oura-owned 0–100 contributor scores — not raw physiological
 * measurements. Oli may normalize, validate, and average them; Oli does not
 * claim to reproduce Oura’s proprietary calculation.
 *
 * Pure helpers: no React, no I/O, no Firebase/API imports.
 *
 * Body temperature deviation is intentionally excluded from this foundation
 * until storage field, units, and exact-day attribution are proven.
 */

export {
  READINESS_RANGE_CONTRIBUTOR_KEYS,
  normalizeReadinessContributorScore,
  mapReadinessRangeContributors,
  type ReadinessRangeContributorKey,
  type OuraReadinessRangeContributorsDto,
} from "@oli/contracts/ouraVendor";
