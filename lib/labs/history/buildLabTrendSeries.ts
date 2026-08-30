/**
 * Deterministic lab trend series from accepted history DTOs.
 * Pure: no Firebase, network, or UI.
 */

import type { LabHistoryPointDto } from "@oli/contracts";
import {
  calculateLabMetricChange,
  type LabMetricChange,
} from "./calculateLabMetricChange";
import {
  labTrendCalendarDateFromCollectedAt,
  labTrendEpochMsFromCalendarDate,
} from "./labTrendCalendar";
import type {
  LabTrendGraphEligibility,
  LabTrendPoint,
  LabTrendSeries,
} from "./labTrendTypes";

const MAX_CHART_POINTS = 50;

type HistoryInput = Pick<
  LabHistoryPointDto,
  | "id"
  | "acceptedResultId"
  | "canonicalMetricId"
  | "collectedAt"
  | "sourceCalendarDate"
  | "result"
  | "displayValue"
  | "rawUnit"
  | "normalizedUnit"
    | "normalizedFlag"
    | "rawReferenceRange"
    | "panelId"
  | "specimenType"
  | "methodId"
  | "measuredOrCalculated"
  | "laboratoryName"
  | "sourceDocumentId"
  | "sourcePage"
  | "trendEligible"
  | "trendEligibility"
  | "historyCompatibilityGroup"
>;

function unitOf(point: HistoryInput): string | null {
  const u = point.normalizedUnit ?? point.rawUnit;
  if (!u || u === "none") return u === "none" ? "none" : null;
  return u;
}

function displayValueOf(point: HistoryInput, value: number, unit: string | null): string {
  if (point.displayValue?.trim()) return point.displayValue.trim();
  if (unit && unit !== "none") return `${value} ${unit}`;
  return String(value);
}

function measuredOrCalculatedOf(
  value: HistoryInput["measuredOrCalculated"],
): LabTrendPoint["measuredOrCalculated"] {
  if (value === "measured" || value === "calculated") return value;
  return "reported_unknown";
}

function isEqualityNumeric(point: HistoryInput): boolean {
  return (
    point.result.kind === "numeric" &&
    point.result.comparator === "eq" &&
    Number.isFinite(point.result.value)
  );
}

function toTrendPoint(point: HistoryInput, metricKey: string): LabTrendPoint | null {
  if (!isEqualityNumeric(point)) return null;
  if (point.trendEligible === false) return null;
  if (point.trendEligibility != null && point.trendEligibility !== "numeric_compatible") {
    return null;
  }

  const collectedDate = labTrendCalendarDateFromCollectedAt(
    point.collectedAt,
    point.sourceCalendarDate ?? null,
  );
  if (!collectedDate) return null;

  const epochMs = labTrendEpochMsFromCalendarDate(collectedDate);
  const value = point.result.kind === "numeric" ? point.result.value : NaN;
  if (!Number.isFinite(value)) return null;

  const unit = unitOf(point);
  const acceptedResultId = point.acceptedResultId ?? point.id;

  return {
    acceptedResultId,
    canonicalMetricId: point.canonicalMetricId ?? metricKey,
    collectedDate,
    epochMs,
    value,
    displayValue: displayValueOf(point, value, unit),
    unit,
    reportFlag: point.normalizedFlag ?? null,
    rawReferenceRange: point.rawReferenceRange ?? null,
    sourceDocumentId: point.sourceDocumentId,
    sourcePage: typeof point.sourcePage === "number" ? point.sourcePage : null,
    panelId: point.panelId ?? null,
    specimenType: point.specimenType ?? null,
    methodId: point.methodId ?? null,
    measuredOrCalculated: measuredOrCalculatedOf(point.measuredOrCalculated),
    laboratoryName: point.laboratoryName ?? null,
  };
}

function sortAscendingByCollection(points: LabTrendPoint[]): LabTrendPoint[] {
  return [...points].sort((a, b) => {
    const byDate = a.collectedDate.localeCompare(b.collectedDate);
    if (byDate !== 0) return byDate;
    // Stable secondary: accepted id (deterministic; never upload time).
    return a.acceptedResultId.localeCompare(b.acceptedResultId);
  });
}

function dedupeTrendPoints(points: LabTrendPoint[]): LabTrendPoint[] {
  const seen = new Set<string>();
  const out: LabTrendPoint[] = [];
  for (const p of points) {
    const key = [
      p.canonicalMetricId,
      p.sourceDocumentId,
      p.collectedDate,
      p.panelId ?? "",
      p.specimenType ?? "",
      p.value,
      p.unit ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    // Also dedupe by acceptedResultId.
    const idKey = `id:${p.acceptedResultId}`;
    if (seen.has(idKey)) continue;
    seen.add(key);
    seen.add(idKey);
    out.push(p);
  }
  return out;
}

function dominantNonNumericEligibility(
  points: readonly HistoryInput[],
): LabTrendGraphEligibility | null {
  let qualitative = 0;
  let pattern = 0;
  let inequality = 0;
  let incompatible = 0;
  let missingDate = 0;

  for (const p of points) {
    const e = p.trendEligibility;
    if (e === "qualitative") qualitative += 1;
    else if (e === "pattern") pattern += 1;
    else if (e === "inequality_table_only") inequality += 1;
    else if (
      e === "incompatible_unit" ||
      e === "incompatible_specimen" ||
      e === "incompatible_method"
    ) {
      incompatible += 1;
    } else if (e === "missing_collection_date" || e === "missing_date") {
      missingDate += 1;
    } else if (p.result.kind === "qualitative" || p.result.kind === "text") {
      qualitative += 1;
    } else if (p.result.kind === "pattern") {
      pattern += 1;
    } else if (p.result.kind === "numeric" && p.result.comparator !== "eq") {
      inequality += 1;
    }
  }

  if (incompatible > 0 && qualitative + pattern + inequality === 0) {
    return "incompatible_history";
  }
  if (missingDate > 0 && qualitative + pattern + inequality + incompatible === 0) {
    return "missing_collection_date";
  }
  if (pattern >= qualitative && pattern >= inequality && pattern > 0) {
    return "pattern_timeline";
  }
  if (inequality >= qualitative && inequality > 0) {
    return "inequality_timeline";
  }
  if (qualitative > 0) return "qualitative_timeline";
  if (incompatible > 0) return "incompatible_history";
  if (missingDate > 0) return "missing_collection_date";
  return null;
}

function filterCompatibleWithLatest(points: readonly LabTrendPoint[]): LabTrendPoint[] {
  if (points.length === 0) return [];
  // Latest for compatibility = last in ascending order.
  const latest = points[points.length - 1]!;
  return points.filter((p) => {
    if ((p.unit ?? "") !== (latest.unit ?? "")) return false;
    if (
      p.specimenType &&
      latest.specimenType &&
      p.specimenType !== "unknown" &&
      latest.specimenType !== "unknown" &&
      p.specimenType !== latest.specimenType
    ) {
      return false;
    }
    if (p.methodId && latest.methodId && p.methodId !== latest.methodId) return false;
    return true;
  });
}

function changeForPair(
  latest: LabTrendPoint,
  prior: LabTrendPoint,
): LabMetricChange | null {
  return calculateLabMetricChange({
    latest: {
      id: latest.acceptedResultId,
      collectedAt: `${latest.collectedDate}T00:00:00.000Z`,
      result: { kind: "numeric", value: latest.value, comparator: "eq" },
    },
    prior: {
      id: prior.acceptedResultId,
      collectedAt: `${prior.collectedDate}T00:00:00.000Z`,
      result: { kind: "numeric", value: prior.value, comparator: "eq" },
    },
  });
}

export function buildLabTrendSeries(args: {
  metricKey: string;
  displayName?: string | null;
  /** History points as returned by the API (typically newest-first). */
  historyPoints: readonly HistoryInput[];
  /** Soft cap for chart series (default 50). */
  maxPoints?: number;
}): LabTrendSeries {
  const metricKey = args.metricKey;
  const maxPoints = args.maxPoints ?? MAX_CHART_POINTS;
  const history = args.historyPoints;

  const candidates = history
    .map((p) => toTrendPoint(p, metricKey))
    .filter((p): p is LabTrendPoint => p != null);

  let points = dedupeTrendPoints(sortAscendingByCollection(candidates));
  points = filterCompatibleWithLatest(points);

  if (points.length > maxPoints) {
    // Keep the most recent maxPoints (end of ascending series).
    points = points.slice(points.length - maxPoints);
  }

  let graphEligibility: LabTrendGraphEligibility;
  if (points.length >= 2) {
    graphEligibility = "numeric_graph";
  } else if (points.length === 1) {
    graphEligibility = "single_numeric_point";
  } else {
    graphEligibility =
      dominantNonNumericEligibility(history) ??
      (history.length === 0 ? "not_graphable" : "not_graphable");
  }

  const latest = points.length > 0 ? points[points.length - 1]! : null;
  const prior = points.length >= 2 ? points[points.length - 2]! : null;
  const change = latest && prior ? changeForPair(latest, prior) : null;

  return {
    metricKey,
    displayName: args.displayName ?? null,
    points,
    latest,
    prior,
    change,
    graphEligibility,
    unit: latest?.unit ?? null,
  };
}

export { MAX_CHART_POINTS };
