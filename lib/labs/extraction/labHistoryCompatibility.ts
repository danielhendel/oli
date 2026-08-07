/**
 * Trend / history compatibility helpers (Phase 3D-A).
 */

import type { AcceptedLabResult, LabHistoryPointDto } from "@oli/contracts";
import {
  buildLabHistoryCompatibilityGroup,
  evaluateLabTrendEligibility,
} from "../history/evaluateLabTrendEligibility";
import { historyTimestampFromAccepted } from "../history/labSourceTimestamp";
import { unitsAreTrendCompatible } from "./parseLabUnit";

export function isAcceptedResultTrendEligible(result: AcceptedLabResult): boolean {
  if (!result.canonicalMetricId) return false;
  if (!result.collectedAt) return false;
  if (result.result.kind !== "numeric") return false;
  if (result.result.comparator !== "eq") return false;
  if (!result.normalizedUnit) return false;
  return true;
}

export function methodCompatibilityForPair(
  a: AcceptedLabResult,
  b: AcceptedLabResult,
): "compatible" | "uncertain" | "incompatible" {
  const aMethod = a.method?.assayMethod ?? null;
  const bMethod = b.method?.assayMethod ?? null;
  if (!aMethod && !bMethod) return "compatible";
  if (!aMethod || !bMethod) return "uncertain";
  if (aMethod === bMethod) return "compatible";
  return "incompatible";
}

function displayValueForAccepted(result: AcceptedLabResult): string {
  if (result.result.kind === "numeric") {
    const op =
      result.result.comparator === "eq"
        ? ""
        : result.result.comparator === "lt"
          ? "<"
          : result.result.comparator === "lte"
            ? "≤"
            : result.result.comparator === "gt"
              ? ">"
              : "≥";
    return `${op}${result.result.value}`;
  }
  if (result.result.kind === "pattern" || result.result.kind === "qualitative" || result.result.kind === "text") {
    return result.result.value;
  }
  return result.result.reason.replace(/_/g, " ");
}

export function toHistoryPointDto(
  result: AcceptedLabResult,
  compatibility: "compatible" | "uncertain" | "incompatible" = "compatible",
): LabHistoryPointDto {
  const measuredOrCalculated =
    result.method?.calculated === true
      ? ("calculated" as const)
      : result.method?.calculated === false
        ? ("measured" as const)
        : ("reported_unknown" as const);
  const trendEligibility = evaluateLabTrendEligibility({
    result: result.result,
    normalizedUnit: result.normalizedUnit,
    specimenType: result.specimen?.type ?? null,
    methodId: result.method?.assayMethod ?? null,
    collectedAt: result.collectedAt,
  });
  const trendEligible =
    isAcceptedResultTrendEligible(result) &&
    compatibility !== "incompatible" &&
    trendEligibility === "numeric_compatible";
  const { calendarDate: sourceCalendarDate } = historyTimestampFromAccepted(
    result.collectedAt,
    result.datePrecision ?? null,
    result.collectedAtSource?.sourceCalendarDate ?? null,
  );

  return {
    id: result.historyPointId ?? result.id,
    acceptedResultId: result.id,
    canonicalMetricId: result.canonicalMetricId,
    collectedAt: result.collectedAt,
    datePrecision: result.datePrecision ?? null,
    ...(sourceCalendarDate ? { sourceCalendarDate } : {}),
    ...(result.historyPointId ? { historyPointId: result.historyPointId } : {}),
    result: result.result,
    displayValue: displayValueForAccepted(result),
    rawUnit: result.rawUnit,
    normalizedUnit: result.normalizedUnit,
    rawReferenceRange: result.rawReferenceRange,
    normalizedFlag: result.normalizedFlag,
    panelId: result.panelId,
    specimenType: result.specimen?.type ?? null,
    methodId: result.method?.assayMethod ?? null,
    measuredOrCalculated,
    laboratoryName: result.laboratory?.name ?? null,
    sourceDocumentId: result.sourceDocumentId,
    sourcePage: result.provenance.sourcePage,
    historyCompatibilityGroup: buildLabHistoryCompatibilityGroup({
      canonicalMetricId: result.canonicalMetricId ?? "unknown",
      normalizedUnit: result.normalizedUnit,
      specimenType: result.specimen?.type ?? null,
      measuredOrCalculated,
    }),
    methodCompatibility: compatibility,
    trendEligible,
    trendEligibility,
  };
}

export function filterHistoryByCompatibleUnits(
  points: AcceptedLabResult[],
  preferredUnit: string | null,
): AcceptedLabResult[] {
  if (!preferredUnit) return points;
  return points.filter((p) => unitsAreTrendCompatible(p.normalizedUnit, preferredUnit));
}
