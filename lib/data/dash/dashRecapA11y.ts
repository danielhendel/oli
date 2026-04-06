// lib/data/dash/dashRecapA11y.ts
import type { DashRecapRow } from "@/lib/data/dash/dashRecapViewModel";

export function dashRecapRowAccessibilityLabel(row: DashRecapRow): string {
  let label = `${row.label}. ${row.valueText}.`;
  if (row.bar.kind === "placement") {
    const pct = Math.round(row.bar.markerPosition01 * 100);
    label += ` Visual placement along scale at ${pct} percent. Not a health rating.`;
  }
  return label;
}
