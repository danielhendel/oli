/**
 * Pure Weight trend chart inspection presentation — hero surface, not floating tooltip.
 */
import { formatWeightTrendCurrentDate } from "@/lib/body/presentation/formatWeightTrendDates";

export type WeightTrendInspection =
  | {
      readonly status: "idle";
    }
  | {
      readonly status: "active";
      readonly pointId: string;
      readonly formattedValue: string;
      readonly formattedDate: string;
      readonly formattedTime: string | null;
      readonly sourceLabel: string | null;
      readonly accessibilityLabel: string;
    };

export type WeightTrendInspectionPoint = {
  readonly observedAt: string;
  readonly dayKey: string;
  readonly weightKg: number;
  readonly sourceId: string;
};

/**
 * Friendly Weight source for hero inspection. Omits unknowns (no "Unknown").
 */
export function friendlyWeightTrendSourceLabel(
  sourceId: string | null | undefined,
): string | null {
  if (sourceId == null || sourceId.length === 0) return null;
  if (sourceId === "apple_health" || sourceId === "healthkit") return "Apple Health";
  if (sourceId === "manual") return "Manual";
  if (sourceId === "withings") return "Withings";
  return null;
}

/** Local clock time for same-day disambiguation — `7:11 PM`. */
export function formatWeightTrendInspectionTime(observedAtIso: string): string | null {
  const ms = Date.parse(observedAtIso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Build active inspection presentation for the fixed hero region.
 */
export function buildWeightTrendInspection(args: {
  readonly point: WeightTrendInspectionPoint;
  readonly formatValue: (weightKg: number) => string;
  /** Count of valid plotted points sharing this dayKey (including the selected). */
  readonly sameDayPointCount: number;
  readonly metricTitle?: string;
}): WeightTrendInspection {
  const sourceLabel = friendlyWeightTrendSourceLabel(args.point.sourceId);
  const formattedValue = args.formatValue(args.point.weightKg);
  const formattedDate = formatWeightTrendCurrentDate(args.point.dayKey);
  const formattedTime =
    args.sameDayPointCount > 1 ? formatWeightTrendInspectionTime(args.point.observedAt) : null;

  const a11yParts = [
    args.metricTitle ?? "Weight",
    formattedValue,
    formattedDate,
  ];
  if (formattedTime) a11yParts.push(formattedTime);
  if (sourceLabel) a11yParts.push(`from ${sourceLabel}`);

  return {
    status: "active",
    pointId: args.point.observedAt,
    formattedValue,
    formattedDate,
    formattedTime,
    sourceLabel,
    accessibilityLabel: a11yParts.join(", "),
  };
}

export const WEIGHT_TREND_INSPECTION_IDLE: WeightTrendInspection = { status: "idle" };
