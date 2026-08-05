/**
 * Privacy-safe Labs review mutation diagnostics (Phase 3D-A).
 * Never logs analyte names, values, units, or report text.
 */

export const LAB_REVIEW_MUTATION_TELEMETRY_LOG_LABEL = "[LAB_REVIEW_MUTATION]" as const;

export type LabReviewCandidateAction = "accept" | "edit" | "reject";

export type LabReviewMutationTelemetryEvent =
  | {
      operation: "lab_review_candidate_action_started";
      documentToken: string;
      candidateToken: string;
      action: LabReviewCandidateAction;
      priorStatus: string;
      reviewVersion: number;
    }
  | {
      operation: "lab_review_candidate_action_completed";
      documentToken: string;
      candidateToken: string;
      action: LabReviewCandidateAction;
      priorStatus: string;
      nextStatus: string;
      httpStatus: number;
      reviewVersion: number;
      elapsedMs: number;
    }
  | {
      operation: "lab_review_candidate_action_failed";
      documentToken: string;
      candidateToken: string;
      action: LabReviewCandidateAction;
      priorStatus: string;
      httpStatus: number;
      safeErrorCode: string;
      reviewVersion: number;
      elapsedMs: number;
    }
  | {
      operation: "lab_review_cache_updated";
      documentToken: string;
      candidateToken: string;
      action: LabReviewCandidateAction;
      nextStatus: string;
      reviewVersion: number;
    };

/** Redact opaque ids to a short non-reversible token for logs. */
export function redactLabsToken(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "empty";
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `t_${hash.toString(16).padStart(8, "0")}_${s.length}`;
}

export function emitLabReviewMutationTelemetry(event: LabReviewMutationTelemetryEvent): void {
  // Structured console only — no PHI fields on the event type.
  // eslint-disable-next-line no-console
  console.info(LAB_REVIEW_MUTATION_TELEMETRY_LOG_LABEL, event);
}
