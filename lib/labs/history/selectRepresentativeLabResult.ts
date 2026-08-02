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
  /** Explicit extraction role — reference_* must never win. */
  sourceValueRole?: string | null;
  /** Review publication status preference. */
  reviewStatus?:
    | "user_corrected"
    | "user_accepted"
    | "system_verified"
    | "auto_published"
    | "auto"
    | "user"
    | null;
  rawValueText?: string | null;
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

function reviewRank(status: LabRepresentativeCandidate["reviewStatus"]): number {
  if (status === "user_corrected") return 0;
  if (status === "user_accepted" || status === "user") return 1;
  if (status === "system_verified") return 2;
  if (status === "auto_published" || status === "auto") return 3;
  return 4;
}

function roleRank(role: string | null | undefined): number {
  if (role === "current_result" || role == null) return 0;
  if (role === "historical_result") return 50;
  if (
    role === "reference_optimal" ||
    role === "reference_moderate" ||
    role === "reference_high" ||
    role === "reference_general"
  ) {
    return 100;
  }
  if (role === "unknown") return 90;
  return 40;
}

function inferComparator(
  result: LabRepresentativeCandidate["result"],
  rawValueText: string | null | undefined,
): string | null {
  if (result?.kind === "numeric" && result.comparator) return result.comparator;
  const raw = (rawValueText ?? "").trim();
  if (/^≤/.test(raw) || /^<=/.test(raw)) return "lte";
  if (/^≥/.test(raw) || /^>=/.test(raw)) return "gte";
  if (/^</.test(raw)) return "lt";
  if (/^>/.test(raw)) return "gt";
  if (result?.kind === "numeric") return "eq";
  return null;
}

function equalityRank(
  result: LabRepresentativeCandidate["result"],
  rawValueText: string | null | undefined,
): number {
  if (!result) return 50;
  if (result.kind === "pattern" || result.kind === "qualitative") return 5;
  if (result.kind === "not_reported") return 40;
  if (result.kind !== "numeric" && result.kind !== "text") return 20;
  const cmp = inferComparator(result, rawValueText);
  if (cmp === "eq") return 0;
  if (cmp === "lt" || cmp === "lte" || cmp === "gt" || cmp === "gte") return 30;
  return 20;
}

function isReferenceLike(candidate: LabRepresentativeCandidate): boolean {
  const role = candidate.sourceValueRole;
  if (
    role === "reference_optimal" ||
    role === "reference_moderate" ||
    role === "reference_high" ||
    role === "reference_general" ||
    role === "historical_result"
  ) {
    return true;
  }
  const cmp = inferComparator(candidate.result, candidate.rawValueText);
  return cmp === "lt" || cmp === "lte" || cmp === "gt" || cmp === "gte";
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

  // Prefer non-reference current rows when any exist.
  const currentOnly = list.filter((c) => !isReferenceLike(c));
  const pool = currentOnly.length > 0 ? currentOnly : list;

  const ranked = [...pool].sort((a, b) => {
    const role = roleRank(a.sourceValueRole) - roleRank(b.sourceValueRole);
    if (role !== 0) return role;
    const review = reviewRank(a.reviewStatus) - reviewRank(b.reviewStatus);
    if (review !== 0) return review;
    const panel =
      panelRank(a.panelName, policy.preferredPanels) - panelRank(b.panelName, policy.preferredPanels);
    if (panel !== 0) return panel;
    const eq =
      equalityRank(a.result, a.rawValueText) - equalityRank(b.result, b.rawValueText);
    if (eq !== 0) return eq;
    const measured =
      measuredRank(a.measuredOrCalculated, policy.measuredPreference) -
      measuredRank(b.measuredOrCalculated, policy.measuredPreference);
    if (measured !== 0) return measured;
    const date = (b.collectedAt ?? "").localeCompare(a.collectedAt ?? "");
    if (date !== 0) return date;
    // Prefer later detail pages when representations agree (page 9/10 over page 6).
    return (b.sourcePage ?? 0) - (a.sourcePage ?? 0);
  });

  return ranked[0] ?? null;
}
