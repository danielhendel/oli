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
  elapsedDays: number | null;
  direction: "increased" | "decreased" | "unchanged";
  interpretation: null;
};

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function calendarDateFromIso(iso: string): string | null {
  const prefix = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return prefix?.[1] ?? null;
}

function elapsedDaysBetweenCollectedAt(latestIso: string, priorIso: string): number | null {
  const latestDate = calendarDateFromIso(latestIso);
  const priorDate = calendarDateFromIso(priorIso);
  if (!latestDate || !priorDate) return null;
  if (!CALENDAR_DATE_RE.test(latestDate) || !CALENDAR_DATE_RE.test(priorDate)) return null;

  const toDayIndex = (calendarDate: string): number | null => {
    const m = CALENDAR_DATE_RE.exec(calendarDate);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
  };

  const latestIndex = toDayIndex(latestDate);
  const priorIndex = toDayIndex(priorDate);
  if (latestIndex == null || priorIndex == null) return null;
  return Math.round(latestIndex - priorIndex);
}

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
    elapsedDays: elapsedDaysBetweenCollectedAt(latest.collectedAt, prior.collectedAt),
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
