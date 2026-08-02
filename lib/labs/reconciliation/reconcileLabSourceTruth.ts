/**
 * Pure source→accepted→display reconciliation guard (no PHI logging).
 */

import type { LabResultValue } from "@oli/contracts";

export type LabSourceTruthReconciliation = {
  candidateId: string;
  sourceResult: LabResultValue;
  acceptedResult: LabResultValue | null;
  displayedResult: LabResultValue | null;
  sourceUnit: string | null;
  acceptedUnit: string | null;
  displayedUnit: string | null;
  metricId: string;
  panelId: string | null;
  specimenType: string | null;
  status:
    | "exact_match"
    | "missing_display"
    | "wrong_value"
    | "wrong_comparator"
    | "wrong_unit"
    | "wrong_metric"
    | "wrong_specimen"
    | "wrong_panel"
    | "duplicate_display"
    | "not_displayable";
  safeReasonCode: string | null;
};

function resultEqual(a: LabResultValue, b: LabResultValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "numeric" && b.kind === "numeric") {
    return a.value === b.value && a.comparator === b.comparator;
  }
  if (a.kind === "pattern" && b.kind === "pattern") return a.value === b.value;
  if (a.kind === "qualitative" && b.kind === "qualitative") return a.value === b.value;
  if (a.kind === "text" && b.kind === "text") return a.value === b.value;
  if (a.kind === "not_reported" && b.kind === "not_reported") return a.reason === b.reason;
  return false;
}

function unitsCompatible(a: string | null, b: string | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const na = a.toLowerCase().replace("mcg", "ug");
  const nb = b.toLowerCase().replace("mcg", "ug");
  return na === nb;
}

export function reconcileLabSourceTruth(args: {
  candidateId: string;
  metricId: string;
  panelId: string | null;
  specimenType: string | null;
  sourceResult: LabResultValue;
  sourceUnit: string | null;
  acceptedResult: LabResultValue | null;
  acceptedUnit: string | null;
  displayedResult: LabResultValue | null;
  displayedUnit: string | null;
  expectedMetricId?: string;
  expectedSpecimenType?: string | null;
}): LabSourceTruthReconciliation {
  const base = {
    candidateId: args.candidateId,
    sourceResult: args.sourceResult,
    acceptedResult: args.acceptedResult,
    displayedResult: args.displayedResult,
    sourceUnit: args.sourceUnit,
    acceptedUnit: args.acceptedUnit,
    displayedUnit: args.displayedUnit,
    metricId: args.metricId,
    panelId: args.panelId,
    specimenType: args.specimenType,
  };

  if (args.expectedMetricId && args.metricId !== args.expectedMetricId) {
    return { ...base, status: "wrong_metric", safeReasonCode: "metric_mismatch" };
  }
  if (
    args.expectedSpecimenType &&
    args.specimenType &&
    args.expectedSpecimenType !== "unknown" &&
    args.specimenType !== args.expectedSpecimenType
  ) {
    return { ...base, status: "wrong_specimen", safeReasonCode: "specimen_mismatch" };
  }
  if (!args.acceptedResult) {
    return { ...base, status: "not_displayable", safeReasonCode: "accepted_missing" };
  }
  if (!resultEqual(args.sourceResult, args.acceptedResult)) {
    if (
      args.sourceResult.kind === "numeric" &&
      args.acceptedResult.kind === "numeric" &&
      args.sourceResult.value === args.acceptedResult.value &&
      args.sourceResult.comparator !== args.acceptedResult.comparator
    ) {
      return { ...base, status: "wrong_comparator", safeReasonCode: "comparator_lost" };
    }
    return { ...base, status: "wrong_value", safeReasonCode: "value_mismatch" };
  }
  if (!unitsCompatible(args.sourceUnit, args.acceptedUnit)) {
    return { ...base, status: "wrong_unit", safeReasonCode: "unit_mismatch" };
  }
  if (!args.displayedResult) {
    return { ...base, status: "missing_display", safeReasonCode: "display_missing" };
  }
  if (!resultEqual(args.acceptedResult, args.displayedResult)) {
    if (
      args.acceptedResult.kind === "numeric" &&
      args.displayedResult.kind === "numeric" &&
      args.acceptedResult.comparator !== args.displayedResult.comparator
    ) {
      return { ...base, status: "wrong_comparator", safeReasonCode: "display_comparator_lost" };
    }
    return { ...base, status: "wrong_value", safeReasonCode: "display_value_mismatch" };
  }
  if (!unitsCompatible(args.acceptedUnit, args.displayedUnit)) {
    return { ...base, status: "wrong_unit", safeReasonCode: "display_unit_mismatch" };
  }
  return { ...base, status: "exact_match", safeReasonCode: null };
}

/** Reject projection when accepted result drifted from the resolved source candidate. */
export function assertAcceptedMatchesSourceCandidate(args: {
  sourceResult: LabResultValue;
  acceptedResult: LabResultValue;
  sourceUnit: string | null;
  acceptedUnit: string | null;
}): { ok: true } | { ok: false; safeReasonCode: string } {
  const r = reconcileLabSourceTruth({
    candidateId: "guard",
    metricId: "x",
    panelId: null,
    specimenType: null,
    sourceResult: args.sourceResult,
    sourceUnit: args.sourceUnit,
    acceptedResult: args.acceptedResult,
    acceptedUnit: args.acceptedUnit,
    displayedResult: args.acceptedResult,
    displayedUnit: args.acceptedUnit,
  });
  if (r.status === "exact_match") return { ok: true };
  return { ok: false, safeReasonCode: r.safeReasonCode ?? r.status };
}
