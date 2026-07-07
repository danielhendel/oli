import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";
import type { Readiness } from "@/lib/contracts/readiness";

/**
 * Conservative physique composition estimates with uncertainty ranges.
 *
 * Does not present point estimates as truth — segments carry likely min/max bounds derived from
 * measurement source quality. No muscle label unless a muscle-specific metric exists in input.
 */
import { formatMassRangeForCopy, type MassDisplayUnit } from "@/lib/body/bodyCompositionShared";
import { weightInUnit } from "@/lib/data/body/bodyWeightDailySeries";

/** Measurement source quality for range width. */
export type PhysiqueMeasurementSource = "dexa" | "bia_smart_scale" | "manual_estimate" | "unknown";

export type PhysiqueEstimateInput = {
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  /** When present in future data contracts, enables the "Muscle" label. */
  skeletalMuscleMassKg?: number | null;
  source: PhysiqueMeasurementSource;
  unit: MassDisplayUnit;
};

export type PhysiqueSegmentKey = "muscle" | "leanTissue" | "bodyFat" | "other";

export type PhysiqueSegmentEstimate = {
  key: PhysiqueSegmentKey;
  label: string;
  centerKg: number;
  rangeLoKg: number;
  rangeHiKg: number;
  rangeLabel: string;
  /** Share of total weight (center values), 0–1. */
  shareCenter: number;
  shareLo: number;
  shareHi: number;
};

export type PhysiqueEstimateModel =
  | { status: Extract<Readiness, "missing">; message: string; accessibilityLabel: string }
  | {
      status: Extract<Readiness, "ready">;
      segments: readonly PhysiqueSegmentEstimate[];
      showOther: boolean;
      source: PhysiqueMeasurementSource;
      sourceNote: string;
      accessibilityLabel: string;
    };

/** Uncertainty margin as a fraction of the segment mass (conservative defaults by source). */
const SOURCE_MARGIN: Record<PhysiqueMeasurementSource, number> = {
  dexa: 0.04,
  bia_smart_scale: 0.1,
  manual_estimate: 0.18,
  unknown: 0.2,
};

const SOURCE_NOTES: Record<PhysiqueMeasurementSource, string> = {
  dexa: "Based on DEXA measurement",
  bia_smart_scale: "Based on available body composition measurements",
  manual_estimate: "Based on manual body composition entry",
  unknown: "Based on available body composition measurements",
};

function clampMass(kg: number): number {
  return Math.max(0, kg);
}

function applyMargin(centerKg: number, source: PhysiqueMeasurementSource): { lo: number; hi: number } {
  const margin = SOURCE_MARGIN[source];
  const spread = centerKg * margin;
  return {
    lo: clampMass(centerKg - spread),
    hi: clampMass(centerKg + spread),
  };
}

function formatLikelyRange(loKg: number, hiKg: number, unit: MassDisplayUnit): string {
  if (unit === "lb") {
    const lo = weightInUnit(loKg, unit);
    const hi = weightInUnit(hiKg, unit);
    return `likely ${lo.toFixed(0)}–${hi.toFixed(0)} lb`;
  }
  return `likely ${loKg.toFixed(1)}–${hiKg.toFixed(1)} kg`;
}

function shareOf(weightKg: number, massKg: number): number {
  if (weightKg <= 0) return 0;
  return clampMass(massKg) / weightKg;
}

/**
 * Infer measurement source from raw-event `sourceId` strings on the snapshot day.
 * Apple Health body data is treated as BIA/smart-scale class (wider ranges).
 */
export type PhysiquePeekRow = {
  sourceId?: string;
  kind: string;
  observedAt: string;
  payload?: unknown;
};

/** Collect distinct `sourceId` values from peek rows on the snapshot day (weight + body_composition). */
export function sourceIdsForSnapshotDay(
  snapshotDay: string,
  peekRows: readonly PhysiquePeekRow[],
  tz: string,
): string[] {
  const ids = new Set<string>();
  for (const r of peekRows) {
    if (r.kind !== "weight" && r.kind !== "body_composition") continue;
    const payload = (r.payload ?? {}) as { time?: string; timezone?: string };
    const dk = deriveWeightPointDayKey(payload, r.observedAt, tz);
    if (dk !== snapshotDay) continue;
    if (typeof r.sourceId === "string" && r.sourceId.length > 0) ids.add(r.sourceId);
  }
  return Array.from(ids);
}

export function inferPhysiqueMeasurementSource(sourceIds: readonly string[]): PhysiqueMeasurementSource {
  const normalized = sourceIds.map((s) => s.toLowerCase());
  if (normalized.some((s) => s.includes("dexa"))) return "dexa";
  if (normalized.some((s) => s === "manual")) return "manual_estimate";
  if (normalized.some((s) => s === "apple_health" || s === "healthkit" || s.includes("health"))) {
    return "bia_smart_scale";
  }
  if (sourceIds.length === 0) return "unknown";
  return "unknown";
}

export function buildPhysiqueEstimateModel(input: PhysiqueEstimateInput): PhysiqueEstimateModel {
  const { weightKg, bodyFatPercent, leanBodyMassKg, skeletalMuscleMassKg, source, unit } = input;

  if (weightKg == null || weightKg <= 0) {
    return {
      status: "missing",
      message: "Add body composition data to estimate physique.",
      accessibilityLabel: "Physique estimate unavailable. Add body composition data.",
    };
  }

  const hasMuscleMetric =
    skeletalMuscleMassKg != null && Number.isFinite(skeletalMuscleMassKg) && skeletalMuscleMassKg > 0;
  const hasBodyFat = bodyFatPercent != null && Number.isFinite(bodyFatPercent) && bodyFatPercent >= 0;
  const hasLean = leanBodyMassKg != null && Number.isFinite(leanBodyMassKg) && leanBodyMassKg > 0;

  if (!hasBodyFat && !hasLean && !hasMuscleMetric) {
    return {
      status: "missing",
      message: "Add body composition data to estimate physique.",
      accessibilityLabel: "Physique estimate unavailable. Add body composition data.",
    };
  }

  const segments: PhysiqueSegmentEstimate[] = [];
  let fatKg = 0;
  let leanKg = 0;
  let muscleKg = 0;

  if (hasMuscleMetric) {
    muscleKg = skeletalMuscleMassKg!;
    const { lo, hi } = applyMargin(muscleKg, source);
    segments.push({
      key: "muscle",
      label: "Muscle",
      centerKg: muscleKg,
      rangeLoKg: lo,
      rangeHiKg: hi,
      rangeLabel: formatLikelyRange(lo, hi, unit),
      shareCenter: shareOf(weightKg, muscleKg),
      shareLo: shareOf(weightKg, lo),
      shareHi: shareOf(weightKg, hi),
    });
  } else if (hasLean) {
    leanKg = leanBodyMassKg!;
    const { lo, hi } = applyMargin(leanKg, source);
    segments.push({
      key: "leanTissue",
      label: "Lean Tissue",
      centerKg: leanKg,
      rangeLoKg: lo,
      rangeHiKg: hi,
      rangeLabel: formatLikelyRange(lo, hi, unit),
      shareCenter: shareOf(weightKg, leanKg),
      shareLo: shareOf(weightKg, lo),
      shareHi: shareOf(weightKg, hi),
    });
  }

  if (hasBodyFat) {
    fatKg = (bodyFatPercent! / 100) * weightKg;
    const { lo, hi } = applyMargin(fatKg, source);
    segments.push({
      key: "bodyFat",
      label: "Body Fat",
      centerKg: fatKg,
      rangeLoKg: lo,
      rangeHiKg: hi,
      rangeLabel: formatLikelyRange(lo, hi, unit),
      shareCenter: shareOf(weightKg, fatKg),
      shareLo: shareOf(weightKg, lo),
      shareHi: shareOf(weightKg, hi),
    });
  } else if (hasLean && !hasMuscleMetric) {
    fatKg = clampMass(weightKg - leanBodyMassKg!);
    if (fatKg > 0) {
      const { lo, hi } = applyMargin(fatKg, source);
      segments.push({
        key: "bodyFat",
        label: "Body Fat",
        centerKg: fatKg,
        rangeLoKg: lo,
        rangeHiKg: hi,
        rangeLabel: formatLikelyRange(lo, hi, unit),
        shareCenter: shareOf(weightKg, fatKg),
        shareLo: shareOf(weightKg, lo),
        shareHi: shareOf(weightKg, hi),
      });
    }
  }

  const accountedCenter = (hasMuscleMetric ? muscleKg : leanKg) + fatKg;
  const otherKg = clampMass(weightKg - accountedCenter);
  const showOther = otherKg > 0.05;

  if (showOther) {
    const { lo, hi } = applyMargin(otherKg, source);
    segments.push({
      key: "other",
      label: "Other",
      centerKg: otherKg,
      rangeLoKg: lo,
      rangeHiKg: hi,
      rangeLabel: formatLikelyRange(lo, hi, unit),
      shareCenter: shareOf(weightKg, otherKg),
      shareLo: shareOf(weightKg, lo),
      shareHi: shareOf(weightKg, hi),
    });
  }

  const spoken = segments
    .map((s) => `${s.label}, ${s.rangeLabel.replace("likely ", "")}`)
    .join(". ");
  const totalRange =
    unit === "lb"
      ? formatMassRangeForCopy(weightKg * 0.95, weightKg * 1.05, unit)
      : formatMassRangeForCopy(weightKg * 0.98, weightKg * 1.02, unit);

  return {
    status: "ready",
    segments,
    showOther,
    source,
    sourceNote: SOURCE_NOTES[source],
    accessibilityLabel: `Physique estimate. Total weight about ${totalRange}. ${spoken}.`,
  };
}

/** Exported for tests — margin fraction for a source. */
export function physiqueMarginForSource(source: PhysiqueMeasurementSource): number {
  return SOURCE_MARGIN[source];
}
