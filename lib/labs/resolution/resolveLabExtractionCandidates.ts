/**
 * Complete candidate resolution for an extraction draft.
 * Every input candidate (matched + unmatched) receives exactly one resolution.
 */
import type {
  LabCandidateResolution,
  LabCandidateResolutionAccounting,
  LabCandidateResolutionRecord,
  LabExtractionDraft,
  LabResultCandidate,
  LabUnmatchedCandidate,
} from "@oli/contracts";
import {
  LAB_CANDIDATE_RESOLUTION_POLICY_VERSION,
  LAB_CATALOG_SCHEMA_VERSION,
} from "@oli/contracts";
import { matchLabAnalyteAlias } from "../extraction/matchLabAnalyteAlias";
import { parseLabResultValue } from "../extraction/parseLabResultValue";
import { parseLabUnitCandidate } from "../extraction/parseLabUnit";
import { parseLabFlagCandidate } from "../extraction/parseLabFlag";
import { getLabMetricByKey } from "../labMetricCatalog";
import { getLabMetricImportProfile } from "../autoPublish/labMetricImportProfiles";
import {
  classifyNonResultLabLabel,
  normalizeLabAnalyteLabelForResolution,
} from "./classifyNonResultLabLabel";
import { refineLabMetricIdWithContext } from "./refineLabMetricIdWithContext";

const CALCULATED_METRICS = new Set([
  "non_hdl_c",
  "chol_hdl_ratio",
  "albumin_globulin_ratio",
  "bun_creatinine_ratio",
  "eag",
  "homa_ir",
  "egfr",
  "bioavailable_testosterone",
  "serum_globulin",
  "transferrin_saturation",
]);

export type LabResolutionPipelineResult = {
  currentResults: LabResultCandidate[];
  classifiedRows: LabUnmatchedCandidate[];
  resolutions: LabCandidateResolutionRecord[];
  accounting: LabCandidateResolutionAccounting;
};

function emptyAccounting(total: number): LabCandidateResolutionAccounting {
  return {
    policyVersion: LAB_CANDIDATE_RESOLUTION_POLICY_VERSION,
    totalExtractedCandidates: total,
    mappedCurrentResults: 0,
    mappedCalculatedResults: 0,
    mappedQualitativeResults: 0,
    mappedInequalityResults: 0,
    duplicateRows: 0,
    historicalRows: 0,
    panelHeaders: 0,
    reportNotes: 0,
    methodNotes: 0,
    riskCategoryRows: 0,
    referenceOnlyRows: 0,
    laboratoryMetadataRows: 0,
    unsupportedTrueAnalytes: 0,
    malformedRows: 0,
    unclassified: 0,
  };
}

function bump(
  accounting: LabCandidateResolutionAccounting,
  resolution: LabCandidateResolution,
  result: LabResultCandidate | null,
): void {
  switch (resolution.kind) {
    case "current_result": {
      accounting.mappedCurrentResults += 1;
      if (resolution.calculatedStatus === "calculated") accounting.mappedCalculatedResults += 1;
      if (result?.result?.kind === "numeric" && result.result.comparator !== "eq") {
        accounting.mappedInequalityResults += 1;
      }
      if (
        result?.result?.kind === "qualitative" ||
        result?.result?.kind === "pattern" ||
        result?.result?.kind === "text" ||
        result?.result?.kind === "not_reported"
      ) {
        accounting.mappedQualitativeResults += 1;
      }
      break;
    }
    case "duplicate_result":
      accounting.duplicateRows += 1;
      break;
    case "historical_result":
      accounting.historicalRows += 1;
      break;
    case "panel_header":
      accounting.panelHeaders += 1;
      break;
    case "risk_category":
      accounting.riskCategoryRows += 1;
      break;
    case "reference_table":
      accounting.referenceOnlyRows += 1;
      break;
    case "method_note":
      accounting.methodNotes += 1;
      break;
    case "report_note":
      accounting.reportNotes += 1;
      break;
    case "laboratory_metadata":
      accounting.laboratoryMetadataRows += 1;
      break;
    case "unsupported_true_analyte":
      accounting.unsupportedTrueAnalytes += 1;
      break;
    case "malformed":
      accounting.malformedRows += 1;
      break;
    default:
      accounting.unclassified += 1;
  }
}

function unmatchedFrom(
  base: Pick<
    LabUnmatchedCandidate,
    "id" | "rawAnalyteLabel" | "rawResult" | "provenance" | "confidence" | "reviewStatus"
  >,
  reason: LabUnmatchedCandidate["reason"],
  resolution: LabCandidateResolution,
): LabUnmatchedCandidate {
  return {
    ...base,
    reason,
    resolutionKind: resolution.kind,
    relatedCandidateId:
      resolution.kind === "duplicate_result"
        ? resolution.canonicalCandidateId
        : resolution.kind === "historical_result"
          ? resolution.relatedCurrentCandidateId
          : null,
    relatedMetricId:
      resolution.kind === "duplicate_result"
        ? (resolution.canonicalMetricId ?? null)
        : resolution.kind === "historical_result"
          ? resolution.canonicalMetricId
          : resolution.kind === "risk_category" ||
              resolution.kind === "reference_table" ||
              resolution.kind === "method_note"
            ? resolution.relatedMetricId
            : null,
    normalizedLabel: normalizeLabAnalyteLabelForResolution(base.rawAnalyteLabel),
  };
}

function tryPromoteUnmatched(u: LabUnmatchedCandidate): LabResultCandidate | null {
  if (u.reason === "historical_column") return null;
  if (classifyNonResultLabLabel(u.rawAnalyteLabel)) return null;

  const parsedValue = parseLabResultValue(u.rawResult);
  if (!parsedValue.ok) return null;

  const alias = matchLabAnalyteAlias(u.rawAnalyteLabel);
  if (!alias.canonicalMetricId || alias.matchMethod === "unmatched") return null;

  const unitParsed = parseLabUnitCandidate(u.rawUnit ?? null);
  const refinedId = refineLabMetricIdWithContext({
    metricId: alias.canonicalMetricId,
    rawLabel: u.rawAnalyteLabel,
    normalizedUnit: unitParsed.normalizedUnit,
    rawUnit: u.rawUnit ?? null,
  });
  if (!refinedId) return null;

  const profile = getLabMetricImportProfile(refinedId);
  if (
    profile &&
    !profile.expectedKinds.includes(parsedValue.value.kind) &&
    parsedValue.value.kind !== "numeric"
  ) {
    if (!(profile.expectedKinds.includes("text") || profile.expectedKinds.includes("pattern"))) {
      return null;
    }
  }

  const unit = unitParsed;
  const nonNumeric = parsedValue.value.kind !== "numeric";
  const metric = getLabMetricByKey(refinedId);
  const preferred = metric?.preferredUnit ?? null;
  let rawUnit = u.rawUnit ?? null;
  // Quest prints "calc" / "Pattern" in the unit column for dimensionless rows.
  if (rawUnit && /^(calc|calculated|pattern)$/i.test(rawUnit.trim())) {
    rawUnit = preferred === "none" || preferred === "ratio" ? preferred : "ratio";
  }
  const unitFromRaw = parseLabUnitCandidate(rawUnit);
  const needsPreferred =
    nonNumeric ||
    !unitFromRaw.normalizedUnit ||
    unitFromRaw.normalizedUnit === "none" ||
    (preferred === "ratio" && !unitFromRaw.normalizedUnit);
  const resolvedUnit =
    needsPreferred && preferred
      ? {
          rawUnit: u.rawUnit ?? null,
          normalizedUnit: preferred,
          unitRegistryVersion: unit.unitRegistryVersion,
          confidence: 0.99,
          known: true,
        }
      : {
          ...unitFromRaw,
          known: nonNumeric ? true : unitFromRaw.known,
          normalizedUnit: nonNumeric
            ? unitFromRaw.normalizedUnit ?? preferred ?? "none"
            : unitFromRaw.normalizedUnit,
          confidence: Math.max(unitFromRaw.confidence, nonNumeric ? 0.99 : unitFromRaw.confidence),
        };

  return {
    id: u.id,
    rawAnalyteLabel: u.rawAnalyteLabel,
    rawResult: u.rawResult,
    result: parsedValue.value,
    unit: resolvedUnit,
    rawReferenceRange: null,
    structuredReferenceRange: null,
    flag: parseLabFlagCandidate(null),
    panelId: null,
    aliasMatch: {
      canonicalMetricId: refinedId,
      matchMethod: alias.matchMethod,
      aliasVersion: alias.aliasVersion,
      confidence: alias.confidence,
      requiresReview: alias.requiresReview,
    },
    method: null,
    laboratory: null,
    provenance: u.provenance,
    confidence: Math.min(parsedValue.confidence, alias.confidence),
    warnings: [],
    reviewStatus: "pending_review",
  };
}

/**
 * Resolve all draft candidates: promote aliases, classify non-results, dedupe metrics.
 */
export function resolveLabExtractionCandidates(draft: LabExtractionDraft): LabResolutionPipelineResult {
  const total = draft.results.length + draft.unmatched.length;
  const accounting = emptyAccounting(total);
  const resolutions: LabCandidateResolutionRecord[] = [];
  const classifiedRows: LabUnmatchedCandidate[] = [];
  const pendingCurrent: LabResultCandidate[] = [];

  const pushResolution = (
    candidateId: string,
    resolution: LabCandidateResolution,
    result: LabResultCandidate | null,
  ) => {
    resolutions.push({
      candidateId,
      resolution,
      policyVersion: LAB_CANDIDATE_RESOLUTION_POLICY_VERSION,
      catalogVersion: LAB_CATALOG_SCHEMA_VERSION,
    });
    bump(accounting, resolution, result);
  };

  for (const u of draft.unmatched) {
    if (u.reason !== "historical_column") continue;
    const resolution: LabCandidateResolution = {
      kind: "historical_result",
      canonicalMetricId: matchLabAnalyteAlias(u.rawAnalyteLabel).canonicalMetricId,
      relatedCurrentCandidateId: null,
    };
    classifiedRows.push(unmatchedFrom(u, "historical_column", resolution));
    pushResolution(u.id, resolution, null);
  }

  for (const u of draft.unmatched) {
    if (u.reason === "historical_column") continue;

    const nonResult = classifyNonResultLabLabel(u.rawAnalyteLabel);
    if (nonResult) {
      const reason: LabUnmatchedCandidate["reason"] =
        nonResult.kind === "risk_category"
          ? "non_result_risk_category"
          : nonResult.kind === "reference_table"
            ? "non_result_reference_table"
            : nonResult.kind === "panel_header"
              ? "non_result_panel_header"
              : nonResult.kind === "method_note"
                ? "non_result_method_note"
                : nonResult.kind === "laboratory_metadata"
                  ? "non_result_laboratory_metadata"
                  : nonResult.kind === "malformed"
                    ? "malformed_row"
                    : "non_result_report_note";
      classifiedRows.push(unmatchedFrom(u, reason, nonResult));
      pushResolution(u.id, nonResult, null);
      continue;
    }

    const promoted = tryPromoteUnmatched(u);
    if (promoted) {
      pendingCurrent.push(promoted);
      continue;
    }

    const alias = matchLabAnalyteAlias(u.rawAnalyteLabel);
    const resolution: LabCandidateResolution =
      alias.confidence >= 0.3 && alias.confidence < 0.5
        ? { kind: "malformed", reason: "identity_ambiguous" }
        : {
            kind: "unsupported_true_analyte",
            normalizedLabel: normalizeLabAnalyteLabelForResolution(u.rawAnalyteLabel),
            reason: "no_canonical_metric",
          };
    classifiedRows.push(
      unmatchedFrom(
        u,
        resolution.kind === "malformed" ? "malformed_row" : "unmatched_alias",
        resolution,
      ),
    );
    pushResolution(u.id, resolution, null);
  }

  pendingCurrent.push(...draft.results);
  // Prefer equality current results and later detail pages over early threshold-only rows.
  pendingCurrent.sort((a, b) => {
    const aEq = a.result?.kind === "numeric" && a.result.comparator === "eq" ? 0 : 1;
    const bEq = b.result?.kind === "numeric" && b.result.comparator === "eq" ? 0 : 1;
    if (aEq !== bEq) return aEq - bEq;
    const aPat = a.result?.kind === "pattern" || a.result?.kind === "qualitative" ? 0 : 1;
    const bPat = b.result?.kind === "pattern" || b.result?.kind === "qualitative" ? 0 : 1;
    if (aPat !== bPat) return aPat - bPat;
    const aNr = a.result?.kind === "not_reported" ? 1 : 0;
    const bNr = b.result?.kind === "not_reported" ? 1 : 0;
    if (aNr !== bNr) return aNr - bNr;
    const page = a.provenance.sourcePage - b.provenance.sourcePage;
    if (page !== 0) return page;
    return a.provenance.sourceLocator.localeCompare(b.provenance.sourceLocator);
  });

  const seenMetric = new Map<string, LabResultCandidate>();
  const currentResults: LabResultCandidate[] = [];

  function panelFamily(panelName: string | null | undefined): string {
    const p = (panelName ?? "").toUpperCase();
    if (/COMPREHENSIVE METABOLIC|CMP\b|BMP\b/.test(p)) return "cmp";
    if (/TESTOSTERONE|BIOAVAILABLE|HORMONE|SHBG|ESTRADIOL|FREE,\s*BIOAVAILABLE/.test(p)) {
      return "hormone";
    }
    if (/CARDIO\s*IQ|ADVANCED LIPID|LIPID/.test(p)) return "lipid";
    if (/CBC|COMPLETE BLOOD/.test(p)) return "cbc";
    return p ? `panel:${p.slice(0, 32)}` : "panel:unknown";
  }

  function identityKey(metricId: string, candidate: LabResultCandidate): string {
    // Same-date multi-result identity: metric + panel family (albumin hormone vs CMP).
    // Include locator when panel is unknown so distinct rows are never collapsed.
    if (metricId === "albumin") {
      const family = panelFamily(candidate.provenance.panelName);
      if (family === "panel:unknown") {
        return `${metricId}|${family}|${candidate.provenance.sourceLocator}`;
      }
      return `${metricId}|${family}`;
    }
    return metricId;
  }

  function isThresholdOnlyInequality(candidate: LabResultCandidate): boolean {
    const role = candidate.provenance.sourceValueRole;
    return (
      role === "reference_optimal" ||
      role === "reference_moderate" ||
      role === "reference_high" ||
      role === "reference_general"
    );
  }

  for (const candidate of pendingCurrent) {
    let working = candidate;
    const refinedId = refineLabMetricIdWithContext({
      metricId: working.aliasMatch.canonicalMetricId,
      rawLabel: working.rawAnalyteLabel,
      normalizedUnit: working.unit.normalizedUnit,
      rawUnit: working.unit.rawUnit,
    });
    if (refinedId && refinedId !== working.aliasMatch.canonicalMetricId) {
      working = {
        ...working,
        aliasMatch: { ...working.aliasMatch, canonicalMetricId: refinedId },
      };
    }
    // Dimensionless unit column cleanup for ratios / patterns.
    if (
      working.unit.rawUnit &&
      /^(calc|calculated|pattern)$/i.test(working.unit.rawUnit.trim())
    ) {
      const preferred = getLabMetricByKey(working.aliasMatch.canonicalMetricId ?? "")?.preferredUnit;
      working = {
        ...working,
        unit: {
          ...working.unit,
          normalizedUnit: preferred ?? "ratio",
          known: true,
          confidence: 0.99,
        },
        warnings: working.warnings.filter((w) => w !== "ambiguous_unit" && w !== "low_confidence"),
        confidence: Math.max(working.confidence, 0.95),
      };
    }
    if (
      (!working.unit.normalizedUnit || !working.unit.known) &&
      working.aliasMatch.canonicalMetricId
    ) {
      const preferred = getLabMetricByKey(working.aliasMatch.canonicalMetricId)?.preferredUnit;
      if (preferred) {
        working = {
          ...working,
          unit: {
            ...working.unit,
            normalizedUnit: preferred,
            known: true,
            confidence: 0.99,
          },
          warnings: working.warnings.filter((w) => w !== "ambiguous_unit" && w !== "low_confidence"),
          confidence: Math.max(working.confidence, 0.95),
        };
      }
    }

    const metricId = working.aliasMatch.canonicalMetricId;
    if (!metricId) {
      const resolution: LabCandidateResolution = {
        kind: "unsupported_true_analyte",
        normalizedLabel: normalizeLabAnalyteLabelForResolution(working.rawAnalyteLabel),
        reason: "no_canonical_metric",
      };
      classifiedRows.push(
        unmatchedFrom(
          {
            id: working.id,
            rawAnalyteLabel: working.rawAnalyteLabel,
            rawResult: working.rawResult,
            provenance: working.provenance,
            confidence: working.confidence,
            reviewStatus: "unresolved",
          },
          "unmatched_alias",
          resolution,
        ),
      );
      pushResolution(working.id, resolution, null);
      continue;
    }

    if (working.provenance.resultRole === "historical_column") {
      const resolution: LabCandidateResolution = {
        kind: "historical_result",
        canonicalMetricId: metricId,
        relatedCurrentCandidateId: seenMetric.get(identityKey(metricId, working))?.id ?? null,
      };
      classifiedRows.push(
        unmatchedFrom(
          {
            id: working.id,
            rawAnalyteLabel: working.rawAnalyteLabel,
            rawResult: working.rawResult,
            provenance: working.provenance,
            confidence: working.confidence,
            reviewStatus: "unresolved",
          },
          "historical_column",
          resolution,
        ),
      );
      pushResolution(working.id, resolution, null);
      continue;
    }

    // Cardio IQ threshold-only inequalities are report reference content, not current results.
    if (isThresholdOnlyInequality(working)) {
      const resolution: LabCandidateResolution = {
        kind: "risk_category",
        relatedMetricId: metricId,
      };
      classifiedRows.push(
        unmatchedFrom(
          {
            id: working.id,
            rawAnalyteLabel: working.rawAnalyteLabel,
            rawResult: working.rawResult,
            provenance: working.provenance,
            confidence: working.confidence,
            reviewStatus: "unresolved",
          },
          "non_result_risk_category",
          resolution,
        ),
      );
      pushResolution(working.id, resolution, null);
      continue;
    }

    const key = identityKey(metricId, working);
    const prior = seenMetric.get(key);
    if (prior) {
      // Prefer replacing a weaker prior (inequality / not_reported) with a stronger current row.
      const priorWeak =
        (prior.result?.kind === "numeric" && prior.result.comparator !== "eq") ||
        prior.result?.kind === "not_reported";
      const workingStrong =
        (working.result?.kind === "numeric" && working.result.comparator === "eq") ||
        working.result?.kind === "pattern" ||
        working.result?.kind === "qualitative";
      // Detail pages (later) confirm Cardio IQ / pattern rows when both are current-strength.
      const workingIsLaterDetail =
        working.provenance.sourcePage > prior.provenance.sourcePage &&
        ((working.result?.kind === "numeric" && working.result.comparator === "eq") ||
          working.result?.kind === "pattern" ||
          working.result?.kind === "qualitative") &&
        ((prior.result?.kind === "numeric" && prior.result.comparator === "eq") ||
          prior.result?.kind === "pattern" ||
          prior.result?.kind === "qualitative");
      if ((priorWeak && workingStrong) || workingIsLaterDetail) {
        // Demote prior to duplicate; keep working as canonical.
        const demoteResolution: LabCandidateResolution = {
          kind: "duplicate_result",
          canonicalCandidateId: working.id,
          duplicateReason: "repeated_page",
          canonicalMetricId: metricId,
        };
        const priorIdx = currentResults.findIndex((r) => r.id === prior.id);
        if (priorIdx >= 0) currentResults.splice(priorIdx, 1);
        classifiedRows.push(
          unmatchedFrom(
            {
              id: prior.id,
              rawAnalyteLabel: prior.rawAnalyteLabel,
              rawResult: prior.rawResult,
              provenance: prior.provenance,
              confidence: prior.confidence,
              reviewStatus: "unresolved",
            },
            "duplicate_result",
            demoteResolution,
          ),
        );
        // Rewrite prior resolution record and accounting (undo current, count duplicate).
        const priorResIdx = resolutions.findIndex((r) => r.candidateId === prior.id);
        if (priorResIdx >= 0) {
          const priorKind = resolutions[priorResIdx]!.resolution.kind;
          if (priorKind === "current_result") {
            accounting.mappedCurrentResults = Math.max(0, accounting.mappedCurrentResults - 1);
            if (prior.result?.kind === "numeric" && prior.result.comparator !== "eq") {
              accounting.mappedInequalityResults = Math.max(0, accounting.mappedInequalityResults - 1);
            }
            if (
              prior.result?.kind === "qualitative" ||
              prior.result?.kind === "pattern" ||
              prior.result?.kind === "text" ||
              prior.result?.kind === "not_reported"
            ) {
              accounting.mappedQualitativeResults = Math.max(0, accounting.mappedQualitativeResults - 1);
            }
          }
          resolutions[priorResIdx] = {
            candidateId: prior.id,
            resolution: demoteResolution,
            policyVersion: LAB_CANDIDATE_RESOLUTION_POLICY_VERSION,
            catalogVersion: LAB_CATALOG_SCHEMA_VERSION,
          };
          accounting.duplicateRows += 1;
        }
        seenMetric.set(key, working);
        // Fall through to push current_result for working.
      } else {
        const samePage = prior.provenance.sourcePage === working.provenance.sourcePage;
        const resolution: LabCandidateResolution = {
          kind: "duplicate_result",
          canonicalCandidateId: prior.id,
          duplicateReason: samePage ? "summary_and_detail" : "repeated_page",
          canonicalMetricId: metricId,
        };
        classifiedRows.push(
          unmatchedFrom(
            {
              id: working.id,
              rawAnalyteLabel: working.rawAnalyteLabel,
              rawResult: working.rawResult,
              provenance: working.provenance,
              confidence: working.confidence,
              reviewStatus: "unresolved",
            },
            "duplicate_result",
            resolution,
          ),
        );
        pushResolution(working.id, resolution, null);
        continue;
      }
    } else {
      seenMetric.set(key, working);
    }
    const calculated = CALCULATED_METRICS.has(metricId);
    const resolution: LabCandidateResolution = {
      kind: "current_result",
      canonicalMetricId: metricId,
      identityMethod:
        working.aliasMatch.matchMethod === "exact_canonical"
          ? "exact_canonical"
          : calculated
            ? "calculated_profile"
            : "exact_alias",
      confidence: 1,
      calculatedStatus: calculated ? "calculated" : "measured",
    };
    currentResults.push(working);
    pushResolution(working.id, resolution, working);
  }

  const accountedIds = new Set(resolutions.map((r) => r.candidateId));
  for (const id of [...draft.results.map((r) => r.id), ...draft.unmatched.map((u) => u.id)]) {
    if (!accountedIds.has(id)) accounting.unclassified += 1;
  }

  return { currentResults, classifiedRows, resolutions, accounting };
}

/** Apply resolution onto a draft (pure): replace results/unmatched. */
export function applyLabCandidateResolution(draft: LabExtractionDraft): LabExtractionDraft & {
  resolutionAccounting: LabCandidateResolutionAccounting;
  resolutions: LabCandidateResolutionRecord[];
} {
  const resolved = resolveLabExtractionCandidates(draft);
  return {
    ...draft,
    results: resolved.currentResults,
    unmatched: resolved.classifiedRows,
    resolutionAccounting: resolved.accounting,
    resolutions: resolved.resolutions,
  };
}
