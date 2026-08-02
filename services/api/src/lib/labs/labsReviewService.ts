/**
 * Labs review accept/reject helpers (server) — Phase 3D-A.
 * High-confidence auto-publish is server-side only (see runLabAutoPublishAfterDraft).
 * No DailyFacts. No Insights.
 */

import type {
  AcceptedLabResult,
  LabExtractionDraft,
  LabMetricResultDto,
  LabNormalizedFlag,
  LabResultCandidate,
  LabReviewRecord,
  LabUnmatchedCandidate,
} from "@oli/contracts";
import { LABS_OS_SCHEMA_VERSION } from "@oli/contracts";
import { getLabMetricByKey } from "../../../../../lib/labs/labMetricCatalog";

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
  reviewStatus: "auto_published" | "user_accepted" | "user_corrected";
  reviewVersion: string;
  acceptedAt: string;
  collectedAt: string | null;
  reportedAt: string | null;
  fasting: boolean | null;
  policyVersion?: string;
}): AcceptedLabResult {
  const c = args.candidate;
  if (!c.result) {
    throw new Error("CANDIDATE_MISSING_RESULT");
  }
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
    reportedAt: args.reportedAt,
    fasting: args.fasting,
    result: c.result,
    rawUnit: c.unit.rawUnit,
    normalizedUnit: c.unit.normalizedUnit,
    rawReferenceRange: c.rawReferenceRange,
    structuredReferenceRange: c.structuredReferenceRange,
    rawFlag: c.flag.rawFlag,
    normalizedFlag: c.flag.normalized,
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
            publicationMode: args.reviewStatus === "auto_published" ? ("auto" as const) : ("user" as const),
          }
        : {}),
    },
    parser: args.draft.parser,
    createdAt: args.acceptedAt,
  };
}

/** Optional v2 projection for existing Labs summary UI (numeric equality only). */
export function projectAcceptedToLabMetricResultDto(
  accepted: AcceptedLabResult,
): LabMetricResultDto | null {
  if (!accepted.canonicalMetricId) return null;
  if (accepted.result.kind !== "numeric" || accepted.result.comparator !== "eq") return null;
  const metric = getLabMetricByKey(accepted.canonicalMetricId);
  if (!metric) return null;

  let rawValueText: string | null = null;
  if (accepted.result.comparator === "eq") {
    rawValueText = String(accepted.result.value);
  }

  return {
    schemaVersion: 2,
    id: accepted.id,
    uploadId: accepted.sourceDocumentId,
    metricKey: accepted.canonicalMetricId,
    displayName: metric.displayName,
    categoryKey: metric.categoryKey,
    value: accepted.result.value,
    unit: accepted.normalizedUnit ?? accepted.rawUnit,
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
    ...(accepted.review.publicationMode ? { publicationMode: accepted.review.publicationMode } : {}),
    ...(Number.isFinite(accepted.provenance.sourcePage) && accepted.provenance.sourcePage >= 1
      ? { sourcePage: accepted.provenance.sourcePage }
      : {}),
    ...(accepted.laboratory?.name ? { laboratoryName: accepted.laboratory.name } : {}),
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
