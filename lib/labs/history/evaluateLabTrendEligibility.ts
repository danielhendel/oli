/**
 * History trend eligibility — table-only vs numeric-compatible.
 */

export type LabTrendEligibility =
  | "numeric_compatible"
  | "table_only"
  | "incompatible_unit"
  | "incompatible_specimen"
  | "incompatible_method"
  | "missing_date"
  | "missing_collection_date"
  | "qualitative"
  | "pattern"
  | "inequality_table_only";

export function evaluateLabTrendEligibility(args: {
  result: { kind: string; comparator?: string } | null;
  normalizedUnit: string | null;
  specimenType?: string | null;
  methodId?: string | null;
  collectedAt: string | null;
  peerSpecimenType?: string | null;
  peerMethodId?: string | null;
  peerNormalizedUnit?: string | null;
}): LabTrendEligibility {
  if (!args.collectedAt) return "missing_collection_date";
  if (!args.result) return "table_only";
  if (args.result.kind === "pattern") return "pattern";
  if (args.result.kind === "qualitative" || args.result.kind === "text") return "qualitative";
  if (args.result.kind === "not_reported") return "table_only";
  if (args.result.kind === "numeric" && args.result.comparator && args.result.comparator !== "eq") {
    return "inequality_table_only";
  }
  if (args.result.kind !== "numeric") return "table_only";
  if (!args.normalizedUnit) return "table_only";
  if (
    args.peerNormalizedUnit &&
    args.normalizedUnit !== args.peerNormalizedUnit &&
    args.normalizedUnit !== "none"
  ) {
    return "incompatible_unit";
  }
  if (
    args.specimenType &&
    args.peerSpecimenType &&
    args.specimenType !== "unknown" &&
    args.peerSpecimenType !== "unknown" &&
    args.specimenType !== args.peerSpecimenType
  ) {
    return "incompatible_specimen";
  }
  if (args.methodId && args.peerMethodId && args.methodId !== args.peerMethodId) {
    return "incompatible_method";
  }
  return "numeric_compatible";
}

export function buildLabHistoryCompatibilityGroup(args: {
  canonicalMetricId: string;
  normalizedUnit: string | null;
  specimenType: string | null;
  measuredOrCalculated: string | null;
}): string {
  return [
    args.canonicalMetricId,
    args.normalizedUnit ?? "unit_unknown",
    args.specimenType ?? "specimen_unknown",
    args.measuredOrCalculated ?? "method_unknown",
  ].join("|");
}

export function sortLabHistoryByCollectionDate<T extends { collectedAt: string | null }>(
  points: readonly T[],
): T[] {
  return [...points].sort((a, b) => (b.collectedAt ?? "").localeCompare(a.collectedAt ?? ""));
}
