/**
 * Collapse duplicate Cardio IQ / multi-page representations of the same current result.
 * Identity uses metric + panel + specimen + method + value — not metric+date alone.
 */

export type LabHistorySourceRepresentation = {
  id: string;
  canonicalMetricId: string;
  collectedAt: string | null;
  panelId?: string | null;
  specimenType?: string | null;
  methodId?: string | null;
  measuredOrCalculated?: string | null;
  sourceDocumentId?: string | null;
  sourceCandidateId?: string | null;
  sourceLocator?: string | null;
  sourcePage?: number | null;
  resultFingerprint: string;
};

function identityKey(row: LabHistorySourceRepresentation): string {
  const parts = [
    row.canonicalMetricId,
    row.collectedAt ?? "no_date",
    row.panelId ?? "panel_unknown",
    row.specimenType ?? "specimen_unknown",
    row.methodId ?? "method_unknown",
    row.measuredOrCalculated ?? "measured_unknown",
  ];
  if (row.sourceDocumentId) parts.push(row.sourceDocumentId);
  if (row.sourceCandidateId) parts.push(row.sourceCandidateId);
  parts.push(row.resultFingerprint);
  return parts.join("|");
}

/**
 * Prefer the later source page (detail confirmation) when representations agree.
 * Disagreement on value fingerprint for the same identity is not collapsed here —
 * callers should fail closed upstream.
 */
export function deduplicateLabHistorySourceRepresentations<T extends LabHistorySourceRepresentation>(
  rows: readonly T[],
): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const key = identityKey(row);
    const prior = best.get(key);
    if (!prior) {
      best.set(key, row);
      continue;
    }
    const priorPage = prior.sourcePage ?? 0;
    const nextPage = row.sourcePage ?? 0;
    if (nextPage > priorPage) {
      best.set(key, row);
      continue;
    }
    if (nextPage === priorPage) {
      const priorLoc = prior.sourceLocator ?? "";
      const nextLoc = row.sourceLocator ?? "";
      if (nextLoc.localeCompare(priorLoc) > 0) best.set(key, row);
    }
  }
  return [...best.values()];
}
