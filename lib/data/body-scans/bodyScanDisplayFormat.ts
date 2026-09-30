/**
 * Consumer display formatting for Body Scan values.
 *
 * Canonical stored precision is independent of what Review/Detail show.
 * Never mutate stored normalized values for aesthetics — format at the edge only.
 */

import type { BodyScanUnit } from "@oli/contracts";

function trimTrailingZeros(text: string): string {
  if (!text.includes(".")) return text;
  return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/**
 * Format a canonical numeric value for consumer UI.
 * Does not invent more precision than typical DXA source reporting for the unit.
 */
export function formatBodyScanConsumerDisplayValue(
  value: number,
  unit: BodyScanUnit,
): string {
  if (!Number.isFinite(value)) return "";
  switch (unit) {
    case "kg":
    case "lb":
      return trimTrailingZeros(value.toFixed(1));
    case "g":
    case "cm3":
      return trimTrailingZeros(value.toFixed(0));
    case "percent":
      return trimTrailingZeros(value.toFixed(1));
    case "ratio":
      // Preserve up to 4 decimals; strip only trailing zeros (1.15 stays 1.15).
      return trimTrailingZeros(value.toFixed(4));
    case "g_per_cm2":
      return trimTrailingZeros(value.toFixed(3));
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/** True when two numbers render identically under consumer display rules for a unit. */
export function bodyScanDisplayValuesEquivalent(
  a: number,
  b: number,
  unit: BodyScanUnit,
): boolean {
  return (
    formatBodyScanConsumerDisplayValue(a, unit) === formatBodyScanConsumerDisplayValue(b, unit)
  );
}

/**
 * "Report shows" line: prefer the extractor rawValue (source digits + unit when present).
 * Never relabel a source lb/g string as the canonical unit.
 */
export function formatBodyScanReportShowsText(rawValue: string): string {
  return rawValue.trim();
}
