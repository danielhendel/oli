/**
 * Projection / accepted-results compatibility boundary (Phase 3D-A).
 *
 * Accepted structured results live in `labAcceptedResults` with full typed LabResultValue.
 *
 * Optional projection into legacy v2 `labResults` (LabMetricResultDto) is intentionally
 * limited to:
 *   - canonicalMetricId present
 *   - result.kind === "numeric"
 *   - result.comparator === "eq"
 *
 * Not projected (remain accepted audit records only):
 *   - inequalities (<, <=, >, >=)
 *   - qualitative / pattern / text / not_reported
 *   - unmatched / rejected / unresolved candidates
 *
 * Labs category cards currently read v2 rows. Non-numeric accepted results remain
 * available via review/history surfaces that read AcceptedLabResult, and must not be
 * forced into the old numeric schema.
 */
export const LABS_V2_PROJECTION_BOUNDARY = {
  schemaVersion: "1.0.0",
  projects: ["numeric_eq_with_canonical_metric"] as const,
  doesNotProject: [
    "numeric_inequality",
    "qualitative",
    "pattern",
    "text",
    "not_reported",
    "unmatched",
    "rejected",
    "unresolved",
  ] as const,
} as const;
