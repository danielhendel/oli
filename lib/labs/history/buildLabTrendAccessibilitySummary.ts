/**
 * Accessibility summary for a lab trend series — no PHI logging, display-safe copy only.
 */

import { evaluateLabSourceReferenceContext } from "../sourceContext/evaluateLabSourceReferenceContext";
import {
  formatLabSourceReferenceRawCopy,
  formatLabSourceReferenceStatusCopy,
} from "../sourceContext/formatLabSourceReferenceCopy";
import { formatLabReferenceOverlayCaption } from "./buildLabReferenceOverlay";
import {
  formatLabTrendPointDate,
} from "./labTrendCalendar";
import type { LabChartReferenceOverlay } from "./labReferenceOverlayTypes";
import type { LabTrendSeries } from "./labTrendTypes";

function speakUnit(unit: string | null): string {
  if (!unit || unit === "none") return "";
  const map: Record<string, string> = {
    "mg/dL": "milligrams per deciliter",
    "ng/dL": "nanograms per deciliter",
    "ng/mL": "nanograms per milliliter",
    "g/dL": "grams per deciliter",
    "mmol/L": "millimoles per liter",
    "mcg/L": "micrograms per liter",
    "x10E3/uL": "thousand per microliter",
    "Thousand/uL": "thousand per microliter",
  };
  return map[unit] ?? unit;
}

function speakReferenceRaw(raw: string, unit: string | null): string {
  let text = raw.trim();
  text = text.replace(/^</, "less than ").replace(/^>/, "greater than ");
  text = text.replace(/^<=|^≤/, "less than or equal to ").replace(/^>=|^≥/, "greater than or equal to ");
  const unitSpeak = speakUnit(unit);
  if (unitSpeak && !text.toLowerCase().includes(unitSpeak.split(" ")[0]!)) {
    return `${text} ${unitSpeak}`.trim();
  }
  return text;
}

export type LabTrendAccessibilityOptions = {
  referenceOverlay?: LabChartReferenceOverlay | null;
};

export function buildLabTrendAccessibilitySummary(
  series: LabTrendSeries,
  opts?: LabTrendAccessibilityOptions,
): string {
  const name = series.displayName?.trim() || series.metricKey.replace(/_/g, " ");

  if (series.graphEligibility === "numeric_graph" && series.points.length >= 2) {
    const first = series.points[0]!;
    const last = series.points[series.points.length - 1]!;
    const unitSpeak = speakUnit(last.unit);
    const latestValue =
      unitSpeak.length > 0 ? `${last.value} ${unitSpeak}` : String(last.value);
    const parts = [
      `${name} trend.`,
      `${series.points.length} results from ${formatLabTrendPointDate(first.collectedDate)} to ${formatLabTrendPointDate(last.collectedDate)}.`,
      `Latest result ${latestValue} on ${formatLabTrendPointDate(last.collectedDate)}.`,
    ];

    const ctx = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: last.value, comparator: "eq" },
      rawReferenceRange: last.rawReferenceRange,
      normalizedFlag: last.reportFlag,
      laboratoryName: last.laboratoryName,
    });
    const status = formatLabSourceReferenceStatusCopy(ctx);
    if (status) parts.push(`${status}.`);

    const overlay = opts?.referenceOverlay ?? null;
    if (overlay && overlay.kind !== "none") {
      const caption = formatLabReferenceOverlayCaption(overlay, { unit: last.unit });
      if (caption) {
        const spoken = speakReferenceRaw(
          overlay.kind === "provider_categories"
            ? overlay.rawReference ?? caption
            : overlay.rawReference,
          last.unit,
        );
        const who = /quest/i.test(overlay.providerName ?? "")
          ? "Quest"
          : overlay.providerName
            ? overlay.providerName.replace(/\s+Diagnostics$/i, "").trim()
            : "Laboratory";
        parts.push(`${who} reference ${spoken}.`);
      }
    } else {
      const raw = formatLabSourceReferenceRawCopy(ctx, { unit: last.unit });
      if (raw) {
        parts.push(
          raw
            .replace(/Quest reference:/i, "Quest reference")
            .replace(/reference:/i, "reference") + ".",
        );
      }
    }

    return parts.join(" ");
  }

  if (series.graphEligibility === "single_numeric_point" && series.latest) {
    const p = series.latest;
    const unitSpeak = speakUnit(p.unit);
    const value = unitSpeak.length > 0 ? `${p.value} ${unitSpeak}` : String(p.value);
    return `${name}. One result so far on ${formatLabTrendPointDate(p.collectedDate)}: ${value}. Trend appears after another compatible result.`;
  }

  if (series.graphEligibility === "qualitative_timeline") {
    return `${name}. Qualitative results are shown in the history table. A numeric trend chart is not available.`;
  }
  if (series.graphEligibility === "pattern_timeline") {
    return `${name}. Pattern results are shown in the history table. A numeric trend chart is not available.`;
  }
  if (series.graphEligibility === "inequality_timeline") {
    return `${name}. Inequality results are shown in the history table. A numeric trend chart is not available.`;
  }
  if (series.graphEligibility === "incompatible_history") {
    return `${name}. Compatible numeric history is not available for a combined trend chart.`;
  }
  if (series.graphEligibility === "missing_collection_date") {
    return `${name}. Collection dates are required before a trend chart can be shown.`;
  }

  return `${name}. No lab trend chart available yet.`;
}
