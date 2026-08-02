/**
 * Consumer representative-result selection for Labs category summaries.
 * Preserves all accepted results; only chooses which one cards display.
 */

export type LabRepresentativeCandidate = {
  id: string;
  canonicalMetricId: string;
  panelName?: string | null;
  specimenType?: string | null;
  measuredOrCalculated?: "measured" | "calculated" | "reported_unknown" | null;
  collectedAt: string | null;
  result: { kind: string; value?: number | string; comparator?: string } | null;
  normalizedUnit?: string | null;
  sourcePage?: number;
};

export type LabRepresentativeResultPolicy = {
  preferredPanels?: readonly string[];
  preferredSpecimens?: readonly string[];
  preferredMethods?: readonly string[];
  measuredPreference: "measured_first" | "calculated_first" | "no_preference";
};

function panelRank(panelName: string | null | undefined, preferred: readonly string[] | undefined): number {
  if (!panelName || !preferred?.length) return 1000;
  const upper = panelName.toUpperCase();
  for (let i = 0; i < preferred.length; i++) {
    if (upper.includes(preferred[i]!.toUpperCase())) return i;
  }
  return 1000;
}

function measuredRank(
  status: LabRepresentativeCandidate["measuredOrCalculated"],
  preference: LabRepresentativeResultPolicy["measuredPreference"],
): number {
  if (preference === "no_preference") return 0;
  if (preference === "measured_first") {
    if (status === "measured") return 0;
    if (status === "reported_unknown" || status == null) return 1;
    return 2;
  }
  if (status === "calculated") return 0;
  if (status === "reported_unknown" || status == null) return 1;
  return 2;
}

function equalityRank(result: LabRepresentativeCandidate["result"]): number {
  if (!result) return 50;
  if (result.kind === "numeric" && result.comparator === "eq") return 0;
  if (result.kind === "numeric") return 10;
  if (result.kind === "pattern" || result.kind === "qualitative") return 5;
  if (result.kind === "not_reported") return 40;
  return 20;
}

/** Default Liver/CMP albumin policy. */
export function defaultRepresentativePolicyForMetric(metricId: string): LabRepresentativeResultPolicy {
  if (metricId === "albumin") {
    return {
      preferredPanels: ["COMPREHENSIVE METABOLIC", "CMP", "BMP"],
      measuredPreference: "measured_first",
    };
  }
  return { measuredPreference: "measured_first" };
}

export function selectRepresentativeLabResult(args: {
  metricId: string;
  candidates: readonly LabRepresentativeCandidate[];
  policy?: LabRepresentativeResultPolicy;
}): LabRepresentativeCandidate | null {
  const list = args.candidates.filter((c) => c.canonicalMetricId === args.metricId);
  if (list.length === 0) return null;
  const policy = args.policy ?? defaultRepresentativePolicyForMetric(args.metricId);

  const ranked = [...list].sort((a, b) => {
    const panel =
      panelRank(a.panelName, policy.preferredPanels) - panelRank(b.panelName, policy.preferredPanels);
    if (panel !== 0) return panel;
    const eq = equalityRank(a.result) - equalityRank(b.result);
    if (eq !== 0) return eq;
    const measured =
      measuredRank(a.measuredOrCalculated, policy.measuredPreference) -
      measuredRank(b.measuredOrCalculated, policy.measuredPreference);
    if (measured !== 0) return measured;
    const date = (b.collectedAt ?? "").localeCompare(a.collectedAt ?? "");
    if (date !== 0) return date;
    return (a.sourcePage ?? 0) - (b.sourcePage ?? 0);
  });

  return ranked[0] ?? null;
}
