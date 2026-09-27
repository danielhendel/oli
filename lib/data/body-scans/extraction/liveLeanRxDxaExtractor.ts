/**
 * Live Lean Rx / GE Lunar style DXA extractor (pure).
 *
 * Reads a PDF *text layer* only. There is no OCR in Stage 3E: an image-only report yields
 * no text, the adapter declines, and the scan goes to manual review with the original kept.
 *
 * The extractor reports what the report says. It never infers, interpolates, or defaults a
 * value, never renames Lean Mass, and never emits a score, band, or diagnosis.
 *
 * Real GE Lunar / Live Lean text layers are often reconstructed with single spaces between
 * column tokens (no fixed-width gaps). Detection and extraction therefore accept both
 * double-space table layouts and single-space token streams, plus (lbs)/(g)/(kg) units.
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

const LB_TO_KG = 0.45359237;
const LB_TO_G = 453.59237;

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

function massScaleForUnitToken(unitToken: string | undefined): number {
  const u = (unitToken ?? "").toLowerCase().replace(/\s+/g, "");
  if (u === "(lbs)" || u === "lbs") return LB_TO_KG;
  if (u === "(g)" || u === "g") return 0.001;
  if (u === "(kg)" || u === "kg") return 1;
  return 1;
}

function bmcScaleForUnitToken(unitToken: string | undefined): number {
  const u = (unitToken ?? "").toLowerCase().replace(/\s+/g, "");
  if (u === "(lbs)" || u === "lbs") return LB_TO_G;
  if (u === "(g)" || u === "g") return 1;
  if (u === "(kg)" || u === "kg") return 1000;
  return 1;
}

/** Header cell → metric. `scale` converts the report unit into the stored unit. */
function columnKindForHeader(header: string): ColumnKind {
  const normalized = header.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    /^(total\s+)?(body\s+)?%?\s*fat$/.test(normalized) ||
    /^total\s+fat\s*%$/.test(normalized) ||
    /^region\s*\(?\s*%\s*fat\)?$/.test(normalized) ||
    /^%\s*fat$/.test(normalized)
  ) {
    return { kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 };
  }
  if (/^(fat\s*mass|fat)\s*\(\s*g\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_mass", unit: "kg", scale: 0.001 };
  }
  if (/^(fat\s*mass|fat)\s*\(\s*kg\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_mass", unit: "kg", scale: 1 };
  }
  if (/^(fat\s*mass|fat)\s*\(\s*lbs\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_mass", unit: "kg", scale: LB_TO_KG };
  }
  if (/^(lean\s*mass|lean)\s*\(\s*g\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "lean_mass", unit: "kg", scale: 0.001 };
  }
  if (/^(lean\s*mass|lean)\s*\(\s*kg\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "lean_mass", unit: "kg", scale: 1 };
  }
  if (/^(lean\s*mass|lean)\s*\(\s*lbs\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "lean_mass", unit: "kg", scale: LB_TO_KG };
  }
  if (/^bmc\s*\(\s*g\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "bone_mineral_content", unit: "g", scale: 1 };
  }
  if (/^bmc\s*\(\s*kg\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "bone_mineral_content", unit: "g", scale: 1000 };
  }
  if (/^bmc\s*\(\s*lbs\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "bone_mineral_content", unit: "g", scale: LB_TO_G };
  }
  if (/^total\s*mass\s*\(\s*kg\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "total_mass", unit: "kg", scale: 1 };
  }
  if (/^total\s*mass\s*\(\s*g\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "total_mass", unit: "kg", scale: 0.001 };
  }
  if (/^total\s*mass\s*\(\s*lbs\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "total_mass", unit: "kg", scale: LB_TO_KG };
  }
  // Tissue-only / fat-free columns exclude bone and are not comparable with region totals.
  return { kind: "ignore" };
}

/**
 * Parse a composition header from a single-space token stream (typical pdfjs output).
 * Returns null when the line is not a Region composition header.
 */
export function parseCompositionHeaderTokens(tokens: readonly string[]): ColumnKind[] | null {
  if (tokens.length < 3) return null;
  if (!/^region$/i.test(tokens[0] ?? "")) return null;

  const cols: ColumnKind[] = [];
  let i = 1;
  while (i < tokens.length) {
    const t0 = (tokens[i] ?? "").toLowerCase();
    const t1 = (tokens[i + 1] ?? "").toLowerCase();
    const t2 = (tokens[i + 2] ?? "").toLowerCase();
    const two = `${t0} ${t1}`.trim();
    const three = `${t0} ${t1} ${t2}`.trim();

    if (three === "total fat %" || (t0 === "total" && t1 === "fat" && /^%/.test(t2))) {
      cols.push({ kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 });
      i += 3;
      continue;
    }
    // Lean % is a display column on limb-balance pages — not stored as a Body Scan metric.
    if (two === "lean %" || (t0 === "lean" && t1 === "%")) {
      cols.push({ kind: "ignore" });
      i += 2;
      continue;
    }
    if (two === "fat %" || (t0 === "fat" && t1 === "%")) {
      cols.push({ kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 });
      i += 2;
      continue;
    }
    if (two === "% fat" || t0 === "%fat" || t0 === "%") {
      if (t0 === "%" && t1 === "fat") {
        cols.push({ kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 });
        i += 2;
        continue;
      }
      if (t0 === "%fat") {
        cols.push({ kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 });
        i += 1;
        continue;
      }
    }
    if (t0 === "region" && /%/.test(t1)) {
      cols.push({ kind: "metric", metricId: "fat_percent", unit: "percent", scale: 1 });
      while (i < tokens.length && !/fat/i.test(tokens[i] ?? "")) i += 1;
      i += 1;
      continue;
    }

    if (two === "fat mass" || (t0 === "fat" && /^\(/.test(t1) && t1 !== "(vat)")) {
      if (two === "fat mass") {
        const unitTok = tokens[i + 2];
        cols.push({
          kind: "metric",
          metricId: "fat_mass",
          unit: "kg",
          scale: massScaleForUnitToken(unitTok),
        });
        i += unitTok && /^\(/.test(unitTok) ? 3 : 2;
        continue;
      }
      cols.push({
        kind: "metric",
        metricId: "fat_mass",
        unit: "kg",
        scale: massScaleForUnitToken(tokens[i + 1]),
      });
      i += 2;
      continue;
    }

    if (two === "lean mass" || (t0 === "lean" && /^\(/.test(t1))) {
      if (two === "lean mass") {
        const unitTok = tokens[i + 2];
        cols.push({
          kind: "metric",
          metricId: "lean_mass",
          unit: "kg",
          scale: massScaleForUnitToken(unitTok),
        });
        i += unitTok && /^\(/.test(unitTok) ? 3 : 2;
        continue;
      }
      cols.push({
        kind: "metric",
        metricId: "lean_mass",
        unit: "kg",
        scale: massScaleForUnitToken(tokens[i + 1]),
      });
      i += 2;
      continue;
    }

    if (t0 === "bmc") {
      const unitTok = tokens[i + 1];
      cols.push({
        kind: "metric",
        metricId: "bone_mineral_content",
        unit: "g",
        scale: bmcScaleForUnitToken(unitTok),
      });
      i += unitTok && /^\(/.test(unitTok) ? 2 : 1;
      continue;
    }

    if (two === "total mass") {
      const unitTok = tokens[i + 2];
      cols.push({
        kind: "metric",
        metricId: "total_mass",
        unit: "kg",
        scale: massScaleForUnitToken(unitTok),
      });
      i += unitTok && /^\(/.test(unitTok) ? 3 : 2;
      continue;
    }

    // Fat Free / Tissue (%Fat) — ignore (not comparable with region totals).
    if (two === "fat free" || t0 === "tissue" || (t0 === "fat" && t1 === "free")) {
      cols.push({ kind: "ignore" });
      i += 1;
      while (i < tokens.length) {
        const cur = tokens[i] ?? "";
        if (/^\(/.test(cur)) {
          i += 1;
          break;
        }
        if (/^(fat|lean|bmc|total|region)$/i.test(cur)) break;
        i += 1;
      }
      continue;
    }

    // Tissue (%Fat) style — ignore.
    if (t0 === "tissue" || (two.startsWith("tissue") && /fat/.test(three))) {
      cols.push({ kind: "ignore" });
      while (i < tokens.length && !/fat\)?$/i.test(tokens[i] ?? "")) i += 1;
      i += 1;
      continue;
    }

    i += 1;
  }

  return cols.some((c) => c.kind === "metric") ? cols : null;
}

type LabelledMetric = {
  pattern: RegExp;
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
  unit: BodyScanUnit;
  /** Fixed scale, or derive from a captured unit group (group 2). */
  scale: number | ((unitGroup: string | undefined) => number);
};

const LABELLED_METRICS: readonly LabelledMetric[] = [
  {
    pattern: /(?:total\s+body\s*%?\s*fat|total\s+fat\s*%|body\s+fat\s*%)\s*[:=]?\s*([\d.,]+)\s*%/i,
    metricId: "fat_percent",
    region: "total",
    unit: "percent",
    scale: 1,
  },
  {
    // Mass only — VAT volume is intentionally not coerced into mass.
    pattern:
      /(?:visceral\s+(?:adipose\s+tissue|fat)\s*(?:\(\s*vat\s*\))?|vat)\s*mass\s*[:=]?\s*([\d.,]+)\s*(g|kg|lbs)?\b/i,
    metricId: "visceral_fat_mass",
    region: "total",
    unit: "kg",
    scale: (unit) => {
      const u = (unit ?? "g").toLowerCase();
      if (u === "kg") return 1;
      if (u === "lbs") return LB_TO_KG;
      return 0.001;
    },
  },
  {
    // Accept Android/Gynoid, Android Gynoid, and A/G ratio labels; allow short
    // non-digit interstitial tokens (units / age-matched captions) before the value.
    pattern:
      /(?:android\s*[/\u2044]\s*gynoid|android\s+gynoid|\ba\s*\/\s*g\b)(?:\s*ratio)?[^\d\n]{0,48}([\d.,]+)/i,
    metricId: "android_gynoid_ratio",
    region: "total",
    unit: "ratio",
    scale: 1,
  },
  {
    pattern: /(?:total\s+body\s+)?bmd\s*[:=]?\s*([\d.,]+)\s*g\s*\/\s*cm/i,
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
  const cleaned = raw.replace(/,/g, "").replace(/%$/g, "").trim();
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

function tokenize(line: string): string[] {
  return line
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function isUnitOnlyToken(token: string): boolean {
  return /^(lbs|g|kg|%)$/i.test(token) || /^\((?:lbs|g|kg)\)$/i.test(token);
}

function isNumericToken(token: string): boolean {
  return /^-?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?$/.test(token) || /^-?\d+(?:\.\d+)?%?$/.test(token);
}

/** Resolve composition columns from either wide (double-space) or pdfjs (single-space) lines. */
export function parseCompositionHeaderLine(line: string): ColumnKind[] | null {
  const cells = splitCells(line);
  if (isCompositionHeader(cells)) {
    return cells.slice(1).map(columnKindForHeader);
  }
  const fromRegion = parseCompositionHeaderTokens(tokenize(line));
  if (fromRegion) return fromRegion;
  return parseLeanBalanceHeaderLine(line);
}

/**
 * Left/Right limb balance tables (common on later Lunar pages) name columns without a
 * leading "Region" token. Detect Lean Mass + Fat Mass headers that also mention Left/Right.
 */
export function parseLeanBalanceHeaderLine(line: string): ColumnKind[] | null {
  if (!/\bleft\b/i.test(line) || !/\bright\b/i.test(line)) return null;
  if (!/\blean\s+mass\b/i.test(line)) return null;
  const tokens = tokenize(line);
  const leanIdx = tokens.findIndex(
    (t, i) => /^lean$/i.test(t) && /^mass$/i.test(tokens[i + 1] ?? ""),
  );
  if (leanIdx < 0) return null;
  return parseCompositionHeaderTokens(["Region", ...tokens.slice(leanIdx)]);
}

/**
 * Match a region label at the start of a token stream (1–2 tokens).
 * Returns the region and the remaining tokens after the label.
 */
function matchRegionAtStart(tokens: readonly string[]): {
  region: BodyScanRegion;
  label: string;
  rest: string[];
} | null {
  if (tokens.length === 0) return null;
  const one = tokens[0] ?? "";
  const two = tokens.length > 1 ? `${tokens[0]} ${tokens[1]}` : "";
  const twoRegion = two ? regionForLabel(two) : null;
  if (twoRegion) {
    return { region: twoRegion, label: two, rest: tokens.slice(2).map(String) };
  }
  const oneRegion = regionForLabel(one);
  if (oneRegion) {
    return { region: oneRegion, label: one, rest: tokens.slice(1).map(String) };
  }
  return null;
}

function valueTokensFromRest(rest: readonly string[]): string[] {
  return rest.filter((t) => !isUnitOnlyToken(t) && isNumericToken(t));
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

/** Modality / vendor signals for the Live Lean / GE Lunar DXA family. */
export function hasDxaModalitySignal(text: string): boolean {
  // DXA, DEXA, and iDXA are all accepted. The prior `\bd[ex]xa\b` form only matched DEXA.
  if (/\b(?:d(?:e)?xa|idxa)\b/i.test(text)) return true;
  if (/\blunar\b/i.test(text)) return true;
  return false;
}

function lineHasCompositionHeader(line: string): boolean {
  return parseCompositionHeaderLine(line) != null;
}

function textHasLabelledTotals(text: string): boolean {
  return LABELLED_METRICS.some((m) => m.pattern.test(text));
}

export function detectLiveLeanRxDxa(input: BodyScanAdapterInput): BodyScanAdapterEligibility {
  if (!hasUsableTextLayer(input)) {
    return { eligible: false, reasonCode: "no_text_layer" };
  }
  const text = input.pages.map((p) => p.text).join("\n");
  if (!hasDxaModalitySignal(text)) {
    return { eligible: false, reasonCode: "not_a_dxa_report" };
  }

  const hasComposition = input.pages.some((page) =>
    page.text.split(/\r?\n/).some((line) => lineHasCompositionHeader(line)),
  );
  const hasLabelledTotals = textHasLabelledTotals(text);
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
      const scale =
        typeof labelled.scale === "function" ? labelled.scale(match[2]) : labelled.scale;
      pushField({
        metricId: labelled.metricId,
        region: labelled.region,
        rawLabel: match[0].split(/[:=]/)[0]?.trim() || match[0].trim(),
        rawValue: match[1],
        normalizedValue: parsed == null ? null : roundTo(parsed * scale, 4),
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
      if (!line.trim()) continue;

      const headerCols = parseCompositionHeaderLine(line);
      if (headerCols) {
        columns = headerCols;
        sawCompositionTable = true;
        continue;
      }
      if (!columns) continue;

      const tokens = tokenize(line);
      const matched = matchRegionAtStart(tokens);
      if (!matched) continue;

      const values = valueTokensFromRest(matched.rest);
      // Wide layouts may still expose values as double-space cells — prefer those when
      // they align better with the header width.
      const cells = splitCells(line);
      const cellRegion = cells.length > 0 ? regionForLabel(cells[0] ?? "") : null;
      const cellValues =
        cellRegion === matched.region && cells.length > 1 ? cells.slice(1) : null;
      const useCells =
        cellValues != null &&
        cellValues.length === columns.length &&
        values.length !== columns.length;
      let rawValues = useCells ? cellValues! : values;
      // Limb-balance rows sometimes prepend an index/diff column; right-align to the header.
      if (rawValues.length > columns.length) {
        rawValues = rawValues.slice(rawValues.length - columns.length);
      }

      if (rawValues.length !== columns.length) {
        warnings.push({
          code: "row_column_count_mismatch",
          message: `A ${matched.region} row did not match the report's column layout.`,
        });
      }

      columns.forEach((column, index) => {
        if (column.kind !== "metric") return;
        const rawValue = rawValues[index];
        if (rawValue == null) return;
        const parsed = parseNumber(rawValue);
        const aligned = rawValues.length === columns?.length;
        pushField({
          metricId: column.metricId,
          region: matched.region,
          rawLabel: `${matched.label} ${column.metricId}`,
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
