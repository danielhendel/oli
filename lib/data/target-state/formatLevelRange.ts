// lib/data/target-state/formatLevelRange.ts
import type { ClassificationLevelBand } from "@/lib/classifications/types";

function formatBound(value: number, unit: string): string {
  if (unit === "%" || unit === "ratio") return `${value}${unit === "ratio" ? "" : unit}`;
  if (unit === "× BW") return `${value}× BW`;
  if (unit === "steps/day") return `${Math.round(value).toLocaleString()} steps/day`;
  if (unit === "min/week") return `${Math.round(value)} min/week`;
  if (unit === "bpm") return `${Math.round(value)} bpm`;
  if (unit === "hours/night") return `${value} h/night`;
  if (unit === "g/kg/day") return `${value} g/kg/day`;
  if (unit === "g/day") return `${Math.round(value)} g/day`;
  if (unit === "kg/m²") return `${value} kg/m²`;
  if (unit === "percentile") return `${Math.round(value)}th percentile`;
  if (unit === "mmHg") return `${Math.round(value)} mmHg`;
  if (unit === "min SD") return `≤${Math.round(value)} min variance`;
  return `${value} ${unit}`;
}

export function formatLevelRange(band: ClassificationLevelBand, unit: string): string {
  const { min, max, minInclusive, maxInclusive } = band;

  if (min != null && max != null) {
    const lo = minInclusive ? min : min;
    const hi = maxInclusive ? max : max;
    if (lo === hi) return formatBound(lo, unit);
    return `${formatBound(lo, unit)} – ${formatBound(hi, unit)}`;
  }

  if (min != null) {
    const op = minInclusive ? "≥" : ">";
    return `${op} ${formatBound(min, unit)}`;
  }

  if (max != null) {
    const op = maxInclusive ? "≤" : "<";
    return `${op} ${formatBound(max, unit)}`;
  }

  return "—";
}

export function getBandForLevel(
  levels: readonly ClassificationLevelBand[],
  level: number,
): ClassificationLevelBand | undefined {
  return levels.find((b) => b.level === level);
}
