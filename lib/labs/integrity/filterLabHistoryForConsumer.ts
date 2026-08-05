/**
 * Consumer history + latest-result ownership for Labs metric detail.
 * Single authoritative layer: accepted structured results (or their projections)
 * after excluding reference thresholds, deleted sources, and same-draw duplicates.
 */

import { isLabReferenceLikeDisplayRow } from "../labSourceDisplay";
import { deduplicateLabHistorySourceRepresentations } from "../history/deduplicateLabHistorySourceRepresentations";
import {
  selectRepresentativeLabResult,
  type LabRepresentativeCandidate,
} from "../history/selectRepresentativeLabResult";
import { isThresholdSiblingOfEqualityCurrent, type LabDerivedAuditInput } from "./classifyLabDerivedRow";

export type LabConsumerHistoryRow = {
  id: string;
  canonicalMetricId: string;
  collectedAt: string | null;
  panelId?: string | null;
  panelName?: string | null;
  specimenType?: string | null;
  methodId?: string | null;
  measuredOrCalculated?: "measured" | "calculated" | "reported_unknown" | null;
  sourceLocator?: string | null;
  sourcePage?: number | null;
  sourceDocumentId?: string | null;
  sourceValueRole?: string | null;
  reviewStatus?: string | null;
  result: { kind: string; value?: number | string; comparator?: string } | null;
  rawValueText?: string | null;
  resultFingerprint: string;
};

function toAuditPeer(row: LabConsumerHistoryRow): LabDerivedAuditInput {
  return {
    layer: "accepted",
    collection: "labAcceptedResults",
    id: row.id,
    canonicalMetricId: row.canonicalMetricId,
    sourceDocumentId: row.sourceDocumentId ?? null,
    sourceExtractionId: null,
    sourceCandidateId: null,
    sourceValueRole: row.sourceValueRole ?? null,
    resultKind: row.result?.kind ?? null,
    comparator:
      row.result && "comparator" in row.result
        ? (row.result.comparator as string | undefined) ?? null
        : null,
    rawValueText: row.rawValueText ?? null,
    panelId: row.panelId ?? null,
    specimenType: row.specimenType ?? null,
    sourcePage: row.sourcePage ?? null,
    collectedAt: row.collectedAt,
    reviewStatus: row.reviewStatus ?? null,
    publicationMode: null,
  };
}

/**
 * Exclude reference thresholds and same-draw inequality siblings of equality currents.
 * Preserves genuine current_result inequalities (no equality sibling).
 */
export function isEligibleLabConsumerHistoryRow(
  row: LabConsumerHistoryRow,
  peers: readonly LabConsumerHistoryRow[],
): boolean {
  const auditPeers = peers.map(toAuditPeer);
  const self = toAuditPeer(row);
  if (isThresholdSiblingOfEqualityCurrent({ row: self, peers: auditPeers })) return false;
  if (
    isLabReferenceLikeDisplayRow({
      sourceValueRole: row.sourceValueRole,
      rawValueText: row.rawValueText,
      comparator:
        row.result && "comparator" in row.result
          ? (row.result.comparator as string | undefined) ?? null
          : null,
    })
  ) {
    // current_result inequalities are not reference-like; role-less inequalities are.
    return false;
  }
  return true;
}

/**
 * Filter → collapse identical source representations → stable identity for history.
 */
export function selectLabConsumerHistoryRows<T extends LabConsumerHistoryRow>(
  rows: readonly T[],
): T[] {
  const eligible = rows.filter((row) => isEligibleLabConsumerHistoryRow(row, rows));
  const dedupedIds = new Set(
    deduplicateLabHistorySourceRepresentations(
      eligible.map((row) => ({
        id: row.id,
        canonicalMetricId: row.canonicalMetricId,
        collectedAt: row.collectedAt,
        panelId: row.panelId ?? null,
        specimenType: row.specimenType ?? null,
        methodId: row.methodId ?? null,
        measuredOrCalculated: row.measuredOrCalculated ?? "reported_unknown",
        sourceLocator: row.sourceLocator ?? null,
        sourcePage: row.sourcePage ?? null,
        resultFingerprint: row.resultFingerprint,
      })),
    ).map((r) => r.id),
  );
  // One history point per source document + metric + collected date after eligibility.
  const byDraw = new Map<string, T>();
  for (const row of eligible) {
    if (!dedupedIds.has(row.id)) continue;
    const key = [
      row.canonicalMetricId,
      row.sourceDocumentId ?? "no_doc",
      row.collectedAt ?? "no_date",
      row.panelId ?? "panel_unknown",
      row.specimenType ?? "specimen_unknown",
    ].join("|");
    const prior = byDraw.get(key);
    if (!prior) {
      byDraw.set(key, row);
      continue;
    }
    // Prefer equality / later page via representative ranking.
    const pick = selectRepresentativeLabResult({
      metricId: row.canonicalMetricId,
      candidates: [toRep(prior), toRep(row)],
    });
    if (pick?.id === row.id) byDraw.set(key, row);
  }
  return [...byDraw.values()];
}

function toRep(row: LabConsumerHistoryRow): LabRepresentativeCandidate {
  return {
    id: row.id,
    canonicalMetricId: row.canonicalMetricId,
    panelName: row.panelName ?? row.panelId ?? null,
    specimenType: row.specimenType ?? null,
    measuredOrCalculated: row.measuredOrCalculated ?? null,
    collectedAt: row.collectedAt,
    result: row.result,
    ...(typeof row.sourcePage === "number" ? { sourcePage: row.sourcePage } : {}),
    sourceValueRole: row.sourceValueRole ?? null,
    reviewStatus: (row.reviewStatus as LabRepresentativeCandidate["reviewStatus"]) ?? null,
    rawValueText: row.rawValueText ?? null,
  };
}

/**
 * Latest consumer result: eligible history → representative selection by collectedAt.
 */
export function selectLabConsumerLatestResult<T extends LabConsumerHistoryRow>(
  rows: readonly T[],
): T | null {
  const history = selectLabConsumerHistoryRows(rows);
  if (history.length === 0) return null;
  const byDate = [...history].sort((a, b) =>
    String(b.collectedAt ?? "").localeCompare(String(a.collectedAt ?? "")),
  );
  const newestDate = byDate[0]?.collectedAt ?? null;
  const sameDay = byDate.filter((r) => (r.collectedAt ?? null) === newestDate);
  const pick = selectRepresentativeLabResult({
    metricId: sameDay[0]!.canonicalMetricId,
    candidates: sameDay.map(toRep),
  });
  if (!pick) return null;
  return sameDay.find((r) => r.id === pick.id) ?? sameDay[0] ?? null;
}
