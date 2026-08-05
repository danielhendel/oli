/**
 * Neutral absolute/percent change between compatible equality numeric points.
 * No health interpretation (improved/worsened) in this phase.
 */

export type LabMetricChangePoint = {
  id: string;
  collectedAt: string;
  result: { kind: "numeric"; value: number; comparator: "eq" | "lt" | "lte" | "gt" | "gte" };
};

export type LabMetricChange = {
  latestResultId: string;
  priorResultId: string;
  absoluteChange: number;
  percentChange: number | null;
  latestCollectedAt: string;
  priorCollectedAt: string;
  direction: "increased" | "decreased" | "unchanged";
  interpretation: null;
};

export function calculateLabMetricChange(args: {
  latest: LabMetricChangePoint;
  prior: LabMetricChangePoint;
}): LabMetricChange | null {
  const { latest, prior } = args;
  if (latest.result.kind !== "numeric" || prior.result.kind !== "numeric") return null;
  if (latest.result.comparator !== "eq" || prior.result.comparator !== "eq") return null;
  if (!Number.isFinite(latest.result.value) || !Number.isFinite(prior.result.value)) return null;

  const absoluteChange = latest.result.value - prior.result.value;
  const percentChange =
    prior.result.value === 0 ? null : (absoluteChange / prior.result.value) * 100;
  const direction =
    absoluteChange > 0 ? "increased" : absoluteChange < 0 ? "decreased" : "unchanged";

  return {
    latestResultId: latest.id,
    priorResultId: prior.id,
    absoluteChange,
    percentChange: percentChange == null ? null : Math.round(percentChange * 10) / 10,
    latestCollectedAt: latest.collectedAt,
    priorCollectedAt: prior.collectedAt,
    direction,
    interpretation: null,
  };
}

/** Consumer-safe neutral change copy — never improved/worsened. */
export function formatLabMetricChangeCopy(args: {
  change: LabMetricChange;
  unit: string | null;
}): string {
  const unit = args.unit?.trim() ? ` ${args.unit.trim()}` : "";
  const priorDate = new Date(args.change.priorCollectedAt);
  const priorLabel = Number.isFinite(priorDate.getTime())
    ? priorDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "the prior test";
  if (args.change.direction === "unchanged") {
    return `No change since ${priorLabel}`;
  }
  const abs = Math.abs(args.change.absoluteChange);
  const absText = Number.isInteger(abs) ? String(abs) : String(Math.round(abs * 100) / 100);
  const verb = args.change.direction === "increased" ? "Increased" : "Decreased";
  if (args.change.percentChange != null) {
    return `${verb} ${Math.abs(args.change.percentChange)}% (${absText}${unit}) since ${priorLabel}`;
  }
  return `${verb} by ${absText}${unit} since ${priorLabel}`;
}
