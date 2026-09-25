/**
 * Live Lean Rx / GE Lunar style DXA extractor (pure).
 *
 * Reads a PDF *text layer* only. There is no OCR in Stage 3E: an image-only report yields
 * no text, the adapter declines, and the scan goes to manual review with the original kept.
 *
 * The extractor reports what the report says. It never infers, interpolates, or defaults a
 * value, never renames Lean Mass, and never emits a score, band, or diagnosis.
 */

import type {
  BodyScanDevice,
  BodyScanExtractedField,
  BodyScanExtractionWarning,
  BodyScanMetricId,
  BodyScanRegion,
  BodyScanUnit,
} from "@oli/contracts";
import {
  fieldRequiresReview,
  hasUsableTextLayer,
  type BodyScanAdapterEligibility,
  type BodyScanAdapterInput,
  type BodyScanAdapterResult,
} from "../bodyScanAdapter";

export const LIVE_LEAN_RX_DXA_ADAPTER_ID = "live_lean_rx_dxa";
export const LIVE_LEAN_RX_DXA_ADAPTER_VERSION = "1.0.0";

/** Confidence for a value read from a header-mapped column or an explicit label. */
const CONFIDENCE_LABELLED = 0.95;
/** Confidence for a value read from assumed column order (header row missing). */
const CONFIDENCE_POSITIONAL = 0.6;

const REGION_ALIASES: readonly (readonly [RegExp, BodyScanRegion])[] = [
  [/^total(\s+body)?$/i, "total"],
  [/^head$/i, "head"],
  [/^trunk$/i, "trunk"],
  [/^android$/i, "android"],
  [/^gynoid$/i, "gynoid"],
  [/^arms$/i, "arms"],
  [/^legs$/i, "legs"],
  [/^(l|left)\s*arm$/i, "left_arm"],
  [/^(r|right)\s*arm$/i, "right_arm"],
  [/^(l|left)\s*leg$/i, "left_leg"],
  [/^(r|right)\s*leg$/i, "right_leg"],
];

type ColumnKind =
  | { kind: "ignore" }
  | { kind: "metric"; metricId: BodyScanMetricId; unit: BodyScanUnit; scale: number };

/** Header cell → metric. `scale` converts the report unit into the stored unit. */
function columnKindForHeader(header: string): ColumnKind {
  const normalized = header.toLowerCase().replace(/\s+/g, " ").trim();
  if (/region\s*\(?\s*%\s*fat/.test(normalized) || /^%\s*fat$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 };
  }
  if (/^fat\s*\(g\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_mass", unit: "kg", scale: 0.001 };
  }
  if (/^fat\s*\(kg\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_mass", unit: "kg", scale: 1 };
  }
  if (/^lean\s*\(g\)$/.test(normalized)) {
    return { kind: "metric", metricId: "lean_mass", unit: "kg", scale: 0.001 };
  }
  if (/^lean\s*\(kg\)$/.test(normalized)) {
    return { kind: "metric", metricId: "lean_mass", unit: "kg", scale: 1 };
  }
  if (/^bmc\s*\(g\)$/.test(normalized)) {
    return { kind: "metric", metricId: "bone_mineral_content", unit: "g", scale: 1 };
  }
  if (/^total\s*mass\s*\(kg\)$/.test(normalized)) {
    return { kind: "metric", metricId: "total_mass", unit: "kg", scale: 1 };
  }
  // Tissue-only columns exclude bone and are not comparable with the region totals.
  return { kind: "ignore" };
}

const LABELLED_METRICS: readonly {
  pattern: RegExp;
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
  unit: BodyScanUnit;
  scale: number;
}[] = [
  {
    pattern: /total\s+body\s*%?\s*fat\s*[:=]?\s*([\d.,]+)\s*%/i,
    metricId: "fat_percent",
    region: "total",
    unit: "percent",
    scale: 1,
  },
  {
    pattern: /visceral\s+(?:adipose\s+tissue|fat)[^:\n]*mass\s*[:=]?\s*([\d.,]+)\s*g\b/i,
    metricId: "visceral_fat_mass",
    region: "total",
    unit: "kg",
    scale: 0.001,
  },
  {
    pattern: /android\s*\/\s*gynoid\s+ratio\s*[:=]?\s*([\d.,]+)/i,
    metricId: "android_gynoid_ratio",
    region: "total",
    unit: "ratio",
    scale: 1,
  },
  {
    pattern: /total\s+body\s+bmd\s*[:=]?\s*([\d.,]+)\s*g\s*\/\s*cm/i,
    metricId: "bone_mineral_density",
    region: "total",
    unit: "g_per_cm2",
    scale: 1,
  },
];

const DEVICE_PATTERNS: readonly (readonly [RegExp, BodyScanDevice])[] = [
  [/\blunar\s+idxa\b/i, { manufacturer: "GE Lunar", model: "iDXA" }],
  [/\blunar\s+prodigy\b/i, { manufacturer: "GE Lunar", model: "Prodigy" }],
  [/\b(ge\s+healthcare\s+)?lunar\b/i, { manufacturer: "GE Lunar", model: null }],
];

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function regionForLabel(label: string): BodyScanRegion | null {
  const normalized = label.replace(/\s+/g, " ").trim();
  for (const [pattern, region] of REGION_ALIASES) {
    if (pattern.test(normalized)) return region;
  }
  return null;
}

/** Split a fixed-width report row on runs of whitespace. */
function splitCells(line: string): string[] {
  return line
    .trim()
    .split(/\s{2,}|\t+/)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isCompositionHeader(cells: readonly string[]): boolean {
  if (cells.length < 3) return false;
  if (!/^region$/i.test(cells[0] ?? "")) return false;
  return cells.slice(1).some((cell) => columnKindForHeader(cell).kind === "metric");
}

function detectDevice(text: string): BodyScanDevice {
  for (const [pattern, device] of DEVICE_PATTERNS) {
    if (pattern.test(text)) return device;
  }
  return { manufacturer: null, model: null };
}

/**
 * Parse an unambiguous scan date. Anything ambiguous stays null so the user supplies it
 * during review rather than the adapter guessing a calendar convention.
 */
export function parseDxaScanDate(text: string): string | null {
  const iso = text.match(/scan\s+date\s*[:=]?\s*(\d{4})-(\d{2})-(\d{2})/i);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }
  const us = text.match(/scan\s+date\s*[:=]?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    // A day-first report would be misread; only accept when the order is unambiguous.
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    if (day <= 12 && month <= 12 && day !== month) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T00:00:00.000Z`;
  }
  return null;
}

export function detectLiveLeanRxDxa(input: BodyScanAdapterInput): BodyScanAdapterEligibility {
  if (!hasUsableTextLayer(input)) {
    return { eligible: false, reasonCode: "no_text_layer" };
  }
  const text = input.pages.map((p) => p.text).join("\n");
  const hasModality = /\bd[ex]xa\b/i.test(text) || /\blunar\b/i.test(text);
  if (!hasModality) return { eligible: false, reasonCode: "not_a_dxa_report" };

  const hasComposition = input.pages.some((page) =>
    page.text.split(/\r?\n/).some((line) => isCompositionHeader(splitCells(line))),
  );
  const hasLabelledTotals = LABELLED_METRICS.some((m) => m.pattern.test(text));
  if (!hasComposition && !hasLabelledTotals) {
    return { eligible: false, reasonCode: "unsupported_dxa_layout" };
  }
  return { eligible: true };
}

export function extractLiveLeanRxDxa(input: BodyScanAdapterInput): BodyScanAdapterResult {
  const text = input.pages.map((p) => p.text).join("\n");
  const fields: BodyScanExtractedField[] = [];
  const warnings: BodyScanExtractionWarning[] = [];
  const seen = new Set<string>();

  const pushField = (args: {
    metricId: BodyScanMetricId;
    region: BodyScanRegion;
    rawLabel: string;
    rawValue: string;
    normalizedValue: number | null;
    unit: BodyScanUnit;
    pageNumber: number;
    confidence: number | null;
    warningCodes?: string[];
  }) => {
    const fieldId = `${args.region}:${args.metricId}`;
    if (seen.has(fieldId)) return;
    seen.add(fieldId);
    fields.push({
      fieldId,
      metricId: args.metricId,
      region: args.region,
      rawLabel: args.rawLabel,
      rawValue: args.rawValue,
      normalizedValue: args.normalizedValue,
      unit: args.unit,
      pageNumber: args.pageNumber,
      sourceLocator: null,
      confidence: args.confidence,
      requiresReview: fieldRequiresReview({
        normalizedValue: args.normalizedValue,
        confidence: args.confidence,
      }),
      warningCodes: args.warningCodes ?? [],
    });
  };

  // 1. Explicitly labelled totals are the most reliable signal, so read them first.
  for (const labelled of LABELLED_METRICS) {
    for (const page of input.pages) {
      const match = page.text.match(labelled.pattern);
      if (!match?.[1]) continue;
      const parsed = parseNumber(match[1]);
      pushField({
        metricId: labelled.metricId,
        region: labelled.region,
        rawLabel: match[0].split(/[:=]/)[0]?.trim() || match[0].trim(),
        rawValue: match[1],
        normalizedValue: parsed == null ? null : roundTo(parsed * labelled.scale, 4),
        unit: labelled.unit,
        pageNumber: page.pageNumber,
        confidence: parsed == null ? null : CONFIDENCE_LABELLED,
        ...(parsed == null ? { warningCodes: ["value_unparsed"] } : {}),
      });
      break;
    }
  }

  // 2. Composition table rows, driven by the report's own header row when present.
  let sawCompositionTable = false;
  for (const page of input.pages) {
    let columns: ColumnKind[] | null = null;
    for (const line of page.text.split(/\r?\n/)) {
      const cells = splitCells(line);
      if (cells.length === 0) continue;

      if (isCompositionHeader(cells)) {
        columns = cells.slice(1).map(columnKindForHeader);
        sawCompositionTable = true;
        continue;
      }
      if (!columns) continue;

      const region = regionForLabel(cells[0] ?? "");
      if (!region) continue;

      const values = cells.slice(1);
      if (values.length !== columns.length) {
        warnings.push({
          code: "row_column_count_mismatch",
          message: `A ${region} row did not match the report's column layout.`,
        });
      }

      columns.forEach((column, index) => {
        if (column.kind !== "metric") return;
        const rawValue = values[index];
        if (rawValue == null) return;
        const parsed = parseNumber(rawValue);
        const aligned = values.length === columns?.length;
        pushField({
          metricId: column.metricId,
          region,
          rawLabel: `${cells[0]} ${column.metricId}`,
          rawValue,
          normalizedValue: parsed == null ? null : roundTo(parsed * column.scale, 4),
          unit: column.unit,
          pageNumber: page.pageNumber,
          confidence: parsed == null ? null : aligned ? CONFIDENCE_LABELLED : CONFIDENCE_POSITIONAL,
          ...(parsed == null ? { warningCodes: ["value_unparsed"] } : {}),
        });
      });
    }
  }

  if (!sawCompositionTable) {
    warnings.push({
      code: "composition_table_missing",
      message: "The regional composition table could not be located in this report.",
    });
  }
  for (const code of input.textWarningCodes) {
    if (code === "partial_page_text" || code === "page_count_mismatch") {
      warnings.push({ code, message: "Only part of this report could be read." });
    }
  }

  const lowConfidenceFieldCount = fields.filter((f) => f.requiresReview).length;
  const status = fields.length === 0 ? "unsupported" : lowConfidenceFieldCount > 0 ? "review_needed" : "extracted";

  return {
    status,
    scanTypeCandidate: "dxa",
    methodCandidate: "dxa",
    device: detectDevice(text),
    performedAtCandidate: parseDxaScanDate(text),
    fields,
    warnings,
  };
}
