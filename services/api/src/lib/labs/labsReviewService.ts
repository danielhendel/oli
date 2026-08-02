/**
 * Labs review accept/reject helpers (server) — Phase 3D-A.
 * High-confidence auto-publish is server-side only (see runLabAutoPublishAfterDraft).
 * No DailyFacts. No Insights.
 */

import type {
  AcceptedLabResult,
  LabDatePrecision,
  LabExtractionDraft,
  LabMetricResultDto,
  LabNormalizedFlag,
  LabResultCandidate,
  LabReviewRecord,
  LabSpecimenType,
  LabUnmatchedCandidate,
} from "@oli/contracts";
import { LABS_OS_SCHEMA_VERSION } from "@oli/contracts";
import { getLabMetricByKey } from "../../../../../lib/labs/labMetricCatalog";
import { assertAcceptedMatchesSourceCandidate } from "../../../../../lib/labs/reconciliation/reconcileLabSourceTruth";

function inferSpecimenType(args: {
  metricId: string | null;
  rawLabel: string;
  reportSpecimen: string | null | undefined;
}): { type: LabSpecimenType; rawLabel: string | null } {
  const label = `${args.rawLabel} ${args.reportSpecimen ?? ""}`.toLowerCase();
  if (args.metricId === "osmolality_urine" || /\(u\)|\burine\b/.test(label)) {
    return { type: "urine", rawLabel: args.reportSpecimen ?? (/\burine\b/i.test(args.rawLabel) ? "urine" : null) };
  }
  if (/\bplasma\b/.test(label)) return { type: "plasma", rawLabel: args.reportSpecimen ?? "plasma" };
  if (/\bwhole blood\b|\bblood\b/.test(label) && !/\bserum\b/.test(label)) {
    return { type: "whole_blood", rawLabel: args.reportSpecimen ?? "blood" };
  }
  if (/\bserum\b/.test(label) || args.metricId === "osmolality_serum") {
    return { type: "serum", rawLabel: args.reportSpecimen ?? "serum" };
  }
  if (args.reportSpecimen) return { type: "other", rawLabel: args.reportSpecimen };
  return { type: "unknown", rawLabel: null };
}

function resolveDatePrecision(
  draft: LabExtractionDraft,
  collectedAt: string | null,
): LabDatePrecision | null {
  if (!collectedAt) return null;
  const fromMeta = draft.reportCandidate.collectedAtPrecision;
  if (fromMeta) return fromMeta;
  return "unknown";
}

type LabCandidateCorrectionFields = LabReviewRecord["corrections"][number]["fields"];

/** Deterministic accepted-result id — prevents duplicate writes on accept replay. */
export function acceptedLabResultId(documentId: string, candidateId: string): string {
  return `acc_${documentId}_${candidateId}`;
}

/** Remove accepted structured result + v2 projection for a rejected/unpublished candidate. */
export async function unpublishAcceptedLabResult(args: {
  documentId: string;
  candidateId: string;
  labAcceptedResultsCol: {
    doc: (id: string) => { delete: () => Promise<unknown> };
  };
  labResultsCol: {
    doc: (id: string) => { delete: () => Promise<unknown> };
  };
}): Promise<{ acceptedId: string }> {
  const acceptedId = acceptedLabResultId(args.documentId, args.candidateId);
  await args.labAcceptedResultsCol.doc(acceptedId).delete();
  await args.labResultsCol.doc(acceptedId).delete();
  return { acceptedId };
}

function mapFlagToV2(flag: LabNormalizedFlag | null): LabMetricResultDto["flag"] {
  if (!flag || flag === "none") return null;
  if (flag === "high" || flag === "critical_high") return flag === "critical_high" ? "critical" : "high";
  if (flag === "low" || flag === "critical_low") return flag === "critical_low" ? "critical" : "low";
  if (flag === "normal") return "normal";
  return "unknown";
}

function applyCorrection(
  candidate: LabResultCandidate,
  correction: LabCandidateCorrectionFields | undefined,
): LabResultCandidate {
  if (!correction) return candidate;
  return {
    ...candidate,
    ...(correction.result ? { result: correction.result } : {}),
    ...(correction.rawUnit !== undefined || correction.normalizedUnit !== undefined
      ? {
          unit: {
            ...candidate.unit,
            rawUnit: correction.rawUnit !== undefined ? correction.rawUnit : candidate.unit.rawUnit,
            normalizedUnit:
              correction.normalizedUnit !== undefined
                ? correction.normalizedUnit
                : candidate.unit.normalizedUnit,
          },
        }
      : {}),
    ...(correction.rawReferenceRange !== undefined
      ? { rawReferenceRange: correction.rawReferenceRange }
      : {}),
    ...(correction.rawFlag !== undefined || correction.normalizedFlag
      ? {
          flag: {
            ...candidate.flag,
            rawFlag: correction.rawFlag !== undefined ? correction.rawFlag : candidate.flag.rawFlag,
            normalized: correction.normalizedFlag ?? candidate.flag.normalized,
          },
        }
      : {}),
    ...(correction.panelId !== undefined ? { panelId: correction.panelId } : {}),
    ...(correction.canonicalMetricId !== undefined
      ? {
          aliasMatch: {
            ...candidate.aliasMatch,
            canonicalMetricId: correction.canonicalMetricId,
          },
        }
      : {}),
  };
}

export function buildAcceptedLabResult(args: {
  userId: string;
  draft: LabExtractionDraft;
  candidate: LabResultCandidate;
  reviewStatus: "auto_published" | "system_verified" | "user_accepted" | "user_corrected";
  reviewVersion: string;
  acceptedAt: string;
  collectedAt: string | null;
  reportedAt: string | null;
  fasting: boolean | null;
  policyVersion?: string;
  verificationMethods?: readonly string[];
  uploadedAt?: string | null;
}): AcceptedLabResult {
  const c = args.candidate;
  if (!c.result) {
    throw new Error("CANDIDATE_MISSING_RESULT");
  }
  const publicationMode =
    args.reviewStatus === "auto_published"
      ? ("auto" as const)
      : args.reviewStatus === "system_verified"
        ? ("system_verified" as const)
        : ("user" as const);
  const specimen = inferSpecimenType({
    metricId: c.aliasMatch.canonicalMetricId,
    rawLabel: c.rawAnalyteLabel,
    reportSpecimen: args.draft.reportCandidate.specimenType,
  });
  return {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: acceptedLabResultId(args.draft.documentId, c.id),
    userId: args.userId,
    sourceDocumentId: args.draft.documentId,
    sourceExtractionId: args.draft.id,
    sourceCandidateId: c.id,
    canonicalMetricId: c.aliasMatch.canonicalMetricId,
    rawAnalyteLabel: c.rawAnalyteLabel,
    panelId: c.panelId,
    collectedAt: args.collectedAt,
    receivedAt: args.draft.reportCandidate.receivedAt ?? null,
    reportedAt: args.reportedAt,
    uploadedAt: args.uploadedAt ?? null,
    datePrecision: resolveDatePrecision(args.draft, args.collectedAt),
    fasting: args.fasting,
    result: c.result,
    rawUnit: c.unit.rawUnit,
    normalizedUnit: c.unit.normalizedUnit,
    rawReferenceRange: c.rawReferenceRange,
    structuredReferenceRange: c.structuredReferenceRange,
    rawFlag: c.flag.rawFlag,
    normalizedFlag: c.flag.normalized,
    specimen,
    laboratory: c.laboratory ?? (args.draft.reportCandidate.laboratoryName
      ? { name: args.draft.reportCandidate.laboratoryName, code: null }
      : null),
    method: c.method ?? null,
    provenance: c.provenance,
    review: {
      status: args.reviewStatus,
      acceptedAt: args.acceptedAt,
      reviewVersion: args.reviewVersion,
      ...(args.policyVersion
        ? {
            policyVersion: args.policyVersion,
            publicationMode,
          }
        : {}),
      ...(args.verificationMethods && args.verificationMethods.length > 0
        ? { verificationMethods: [...args.verificationMethods] }
        : {}),
    },
    parser: args.draft.parser,
    createdAt: args.acceptedAt,
  };
}

/** Optional v2 projection for Labs summary UI (numeric + displayable non-numeric). */
export function projectAcceptedToLabMetricResultDto(
  accepted: AcceptedLabResult,
): LabMetricResultDto | null {
  if (!accepted.canonicalMetricId) return null;
  const metric = getLabMetricByKey(accepted.canonicalMetricId);
  if (!metric) return null;

  let value: number | null = null;
  let rawValueText: string | null = null;
  if (accepted.result.kind === "numeric") {
    const comparator = accepted.result.comparator;
    value = accepted.result.value;
    if (comparator === "eq") {
      rawValueText = String(value);
    } else {
      const op =
        comparator === "lt"
          ? "<"
          : comparator === "lte"
            ? "≤"
            : comparator === "gt"
              ? ">"
              : "≥";
      rawValueText = `${op}${value}`;
    }
  } else if (accepted.result.kind === "pattern") {
    rawValueText = accepted.result.value;
    value = null;
  } else if (accepted.result.kind === "qualitative") {
    rawValueText = accepted.result.value;
    value = null;
  } else if (accepted.result.kind === "text") {
    rawValueText = accepted.result.value;
    value = null;
  } else {
    // not_reported — still project a display token so cards are not blank.
    rawValueText = accepted.result.reason.replace(/_/g, " ");
    value = null;
  }

  return {
    schemaVersion: 2,
    id: accepted.id,
    uploadId: accepted.sourceDocumentId,
    metricKey: accepted.canonicalMetricId,
    displayName: metric.displayName,
    categoryKey: metric.categoryKey,
    // Inequalities keep bound value for storage; display uses rawValueText.
    value,
    unit:
      accepted.result.kind === "numeric"
        ? accepted.normalizedUnit ?? accepted.rawUnit
        : accepted.normalizedUnit === "none"
          ? null
          : accepted.normalizedUnit ?? accepted.rawUnit,
    referenceRangeText: accepted.rawReferenceRange,
    flag: mapFlagToV2(accepted.normalizedFlag),
    collectedAt: accepted.collectedAt,
    reportedAt: accepted.reportedAt,
    source: "lab_pdf",
    confidence: 1,
    rawName: accepted.rawAnalyteLabel,
    rawUnit: accepted.rawUnit,
    rawValueText,
    createdAt: accepted.createdAt,
    ...(accepted.review.publicationMode === "user"
      ? { publicationMode: "user" as const }
      : accepted.review.publicationMode
        ? { publicationMode: "auto" as const }
        : {}),
    ...(Number.isFinite(accepted.provenance.sourcePage) && accepted.provenance.sourcePage >= 1
      ? { sourcePage: accepted.provenance.sourcePage }
      : {}),
    ...(accepted.laboratory?.name ? { laboratoryName: accepted.laboratory.name } : {}),
    ...(accepted.provenance.panelName ? { panelName: accepted.provenance.panelName } : {}),
    ...(accepted.datePrecision ? { datePrecision: accepted.datePrecision } : {}),
  };
}

/**
 * Guarded projection: reject when accepted drifted from the source candidate.
 * Safe reason codes only — never log clinical values.
 */
export function projectAcceptedWithSourceGuard(args: {
  accepted: AcceptedLabResult;
  sourceResult: AcceptedLabResult["result"];
  sourceUnit: string | null;
}): { projection: LabMetricResultDto | null; withheldReasonCode: string | null } {
  const guard = assertAcceptedMatchesSourceCandidate({
    sourceResult: args.sourceResult,
    acceptedResult: args.accepted.result,
    sourceUnit: args.sourceUnit,
    acceptedUnit: args.accepted.normalizedUnit ?? args.accepted.rawUnit,
  });
  if (!guard.ok) {
    return { projection: null, withheldReasonCode: guard.safeReasonCode };
  }
  return {
    projection: projectAcceptedToLabMetricResultDto(args.accepted),
    withheldReasonCode: null,
  };
}

export function resolveCandidatesForAccept(args: {
  draft: LabExtractionDraft;
  review: LabReviewRecord;
  candidateIds?: string[] | undefined;
}): { accepted: LabResultCandidate[]; skippedUnresolved: string[] } {
  const wanted = args.candidateIds ? new Set(args.candidateIds) : null;
  const correctionById = new Map(
    args.review.corrections.map((c) => [c.candidateId, c.fields] as const),
  );
  const accepted: LabResultCandidate[] = [];
  const skippedUnresolved: string[] = [];

  for (const candidate of args.draft.results) {
    if (wanted && !wanted.has(candidate.id)) continue;
    const status = args.review.candidateStatuses[candidate.id] ?? "pending_review";
    if (status === "rejected") continue;
    if (status === "auto_published") {
      continue;
    }
    if (status === "unresolved" || status === "pending_review") {
      if (!wanted) {
        skippedUnresolved.push(candidate.id);
        continue;
      }
    }
    const corrected = applyCorrection(candidate, correctionById.get(candidate.id));
    if (!corrected.result || !corrected.aliasMatch.canonicalMetricId) {
      skippedUnresolved.push(candidate.id);
      continue;
    }
    accepted.push({
      ...corrected,
      reviewStatus: status === "user_corrected" ? "user_corrected" : "user_accepted",
    });
  }

  const unmatched: LabUnmatchedCandidate[] = args.draft.unmatched;
  for (const u of unmatched) {
    if (wanted && wanted.has(u.id)) {
      skippedUnresolved.push(u.id);
    }
  }

  return { accepted, skippedUnresolved };
}
