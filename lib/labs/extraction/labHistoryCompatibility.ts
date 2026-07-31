/**
 * Trend / history compatibility helpers (Phase 3D-A).
 */

import type { AcceptedLabResult, LabHistoryPointDto } from "@oli/contracts";
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

export function toHistoryPointDto(
  result: AcceptedLabResult,
  compatibility: "compatible" | "uncertain" | "incompatible" = "compatible",
): LabHistoryPointDto {
  const trendEligible =
    isAcceptedResultTrendEligible(result) &&
    compatibility !== "incompatible" &&
    Boolean(result.normalizedUnit);

  return {
    id: result.id,
    canonicalMetricId: result.canonicalMetricId,
    collectedAt: result.collectedAt,
    result: result.result,
    rawUnit: result.rawUnit,
    normalizedUnit: result.normalizedUnit,
    rawReferenceRange: result.rawReferenceRange,
    normalizedFlag: result.normalizedFlag,
    laboratoryName: result.laboratory?.name ?? null,
    sourceDocumentId: result.sourceDocumentId,
    sourcePage: result.provenance.sourcePage,
    methodCompatibility: compatibility,
    trendEligible,
  };
}

export function filterHistoryByCompatibleUnits(
  points: AcceptedLabResult[],
  preferredUnit: string | null,
): AcceptedLabResult[] {
  if (!preferredUnit) return points;
  return points.filter((p) => unitsAreTrendCompatible(p.normalizedUnit, preferredUnit));
}
