import type { LabHistoryPointDto } from "@oli/contracts";

/** Shared numeric history fixture for trend tests (no PHI). */
export function makeNumericHistoryPoint(
  overrides: Partial<LabHistoryPointDto> &
    Pick<LabHistoryPointDto, "id" | "collectedAt" | "sourceDocumentId"> & {
      value: number;
    },
): LabHistoryPointDto {
  const { value, result: resultOverride, ...rest } = overrides;
  return {
    canonicalMetricId: "total_cholesterol",
    datePrecision: "date_only",
    sourceCalendarDate:
      (overrides.sourceCalendarDate ??
        (overrides.collectedAt ? overrides.collectedAt.slice(0, 10) : null)) ||
      null,
    rawUnit: "mg/dL",
    normalizedUnit: "mg/dL",
    rawReferenceRange: null,
    normalizedFlag: null,
    panelId: "lipid",
    specimenType: "serum",
    methodId: null,
    measuredOrCalculated: "measured",
    laboratoryName: "Quest Diagnostics",
    sourcePage: 1,
    methodCompatibility: "compatible",
    trendEligible: true,
    trendEligibility: "numeric_compatible",
    ...rest,
    result: resultOverride ?? { kind: "numeric", value, comparator: "eq" },
  };
}
