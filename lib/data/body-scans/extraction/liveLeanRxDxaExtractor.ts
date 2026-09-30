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
/** Exact cubic-inch → cubic-centimetre factor (1 in = 2.54 cm). */
const IN3_TO_CM3 = 2.54 ** 3;

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
  if (/^fat[\s-]*free(\s*mass)?\s*\(\s*g\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_free_mass", unit: "kg", scale: 0.001 };
  }
  if (/^fat[\s-]*free(\s*mass)?\s*\(\s*kg\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_free_mass", unit: "kg", scale: 1 };
  }
  if (/^fat[\s-]*free(\s*mass)?\s*\(\s*lbs\s*\)$/.test(normalized)) {
    return { kind: "metric", metricId: "fat_free_mass", unit: "kg", scale: LB_TO_KG };
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

    // Fat Free Mass is source-backed and distinct from Lean Mass — emit when present.
    if (two === "fat free" || (t0 === "fat" && t1 === "free")) {
      const unitTok =
        /^\(/.test(tokens[i + 2] ?? "")
          ? tokens[i + 2]
          : /^\(/.test(tokens[i + 3] ?? "")
            ? tokens[i + 3]
            : undefined;
      cols.push({
        kind: "metric",
        metricId: "fat_free_mass",
        unit: "kg",
        scale: massScaleForUnitToken(unitTok),
      });
      i += 2;
      while (i < tokens.length) {
        const cur = tokens[i] ?? "";
        if (/^\(/.test(cur)) {
          i += 1;
          break;
        }
        if (/^(fat|lean|bmc|total|region|mass)$/i.test(cur) && !/^free$/i.test(cur)) break;
        if (/^mass$/i.test(cur)) {
          i += 1;
          continue;
        }
        i += 1;
      }
      continue;
    }

    // Tissue (%Fat) style — ignore (not Fat-Free Mass).
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
  /** Optional unit fragment appended to rawValue for "Report shows". */
  rawUnitFromGroup?: (unitGroup: string | undefined) => string;
};

function massUnitScale(unit: string | undefined): number {
  const u = (unit ?? "g").toLowerCase();
  if (u === "kg") return 1;
  if (u === "lbs" || u === "lb") return LB_TO_KG;
  return 0.001; // g default for Lunar VAT mass tables
}

function massRawUnit(unit: string | undefined): string {
  const u = (unit ?? "g").toLowerCase();
  if (u === "kg") return "kg";
  if (u === "lbs" || u === "lb") return "lb";
  return "g";
}

function volumeUnitScale(unit: string | undefined): number {
  const u = (unit ?? "cm3").toLowerCase().replace(/\s+/g, "");
  if (u === "in3" || u === "in³") return IN3_TO_CM3;
  return 1; // cm3 / cm³
}

function volumeRawUnit(unit: string | undefined): string {
  const u = (unit ?? "cm3").toLowerCase().replace(/\s+/g, "");
  if (u === "in3" || u === "in³") return "in³";
  return "cm³";
}

const LABELLED_METRICS: readonly LabelledMetric[] = [
  {
    pattern: /(?:total\s+body\s*%?\s*fat|total\s+fat\s*%|body\s+fat\s*%)\s*[:=]?\s*([\d.,]+)\s*%/i,
    metricId: "fat_percent",
    region: "total",
    unit: "percent",
    scale: 1,
  },
  {
    // Explicit source-reported total Fat-Free Mass (distinct from Lean Mass).
    pattern:
      /(?:total\s+)?(?:body\s+)?fat[\s-]*free\s*mass\s*[:=]?\s*([\d.,]+)\s*(g|kg|lbs|lb)?\b/i,
    metricId: "fat_free_mass",
    region: "total",
    unit: "kg",
    scale: (unit) => massUnitScale(unit ?? "kg"),
    rawUnitFromGroup: (unit) => massRawUnit(unit ?? "kg"),
  },
  {
    // Mass only — never coerce volume into mass.
    pattern:
      /(?:visceral\s+(?:adipose\s+tissue|fat)\s*(?:\(\s*vat\s*\))?|vat)\s*mass\s*[:=]?\s*([\d.,]+)\s*(g|kg|lbs|lb)?\b/i,
    metricId: "visceral_fat_mass",
    region: "total",
    unit: "kg",
    scale: (unit) => massUnitScale(unit),
    rawUnitFromGroup: (unit) => massRawUnit(unit),
  },
  {
    // Source-reported VAT volume only — never infer from mass.
    pattern:
      /(?:visceral\s+(?:adipose\s+tissue|fat)\s*(?:\(\s*vat\s*\))?|vat)\s*volume\s*[:=]?\s*([\d.,]+)\s*(cm\s*3|cm³|in\s*3|in³)?\b/i,
    metricId: "visceral_fat_volume",
    region: "total",
    unit: "cm3",
    scale: (unit) => volumeUnitScale(unit),
    rawUnitFromGroup: (unit) => volumeRawUnit(unit),
  },
  {
    pattern: /(?:total\s+body\s+)?(?:tb\s*)?bmd\s*[:=]?\s*([\d.,]+)\s*(?:g\s*\/\s*cm(?:2|²)?|g\s*cm\s*-?\s*2)?/i,
    metricId: "bone_mineral_density",
    region: "total",
    unit: "g_per_cm2",
    scale: 1,
    rawUnitFromGroup: () => "g/cm²",
  },
  {
    pattern: /bone\s+mineral\s+density\s*[:=]?\s*([\d.,]+)\s*(?:g\s*\/\s*cm(?:2|²)?)?/i,
    metricId: "bone_mineral_density",
    region: "total",
    unit: "g_per_cm2",
    scale: 1,
    rawUnitFromGroup: () => "g/cm²",
  },
];

type AgCandidate = {
  raw: string;
  value: number;
  labelScore: number;
  decimalPlaces: number;
  rawLabel: string;
};

/**
 * Prefer full "Android/Gynoid" labels and the highest source decimal precision.
 * Avoids capturing a low-precision bare "A/G 1.0" when "Android/Gynoid Ratio 1.15" exists.
 */
export function selectBestAndroidGynoidMatch(text: string): AgCandidate | null {
  const pattern =
    /(android\s*[/\u2044]\s*gynoid|android\s+gynoid|\ba\s*\/\s*g\b)(?:\s*ratio)?[^\d\n]{0,48}([\d]+(?:[.,]\d+)?)/gi;
  const candidates: AgCandidate[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) != null) {
    const label = match[1] ?? "";
    const raw = (match[2] ?? "").replace(",", ".");
    const value = parseNumber(raw);
    if (value == null) continue;
    const labelScore = /android/i.test(label) && /gynoid/i.test(label) ? 2 : 1;
    const decimalPlaces = raw.includes(".") ? (raw.split(".")[1]?.length ?? 0) : 0;
    candidates.push({
      raw,
      value,
      labelScore,
      decimalPlaces,
      rawLabel: match[0].split(/[:=]/)[0]?.trim() || match[0].trim(),
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.labelScore !== a.labelScore) return b.labelScore - a.labelScore;
    if (b.decimalPlaces !== a.decimalPlaces) return b.decimalPlaces - a.decimalPlaces;
    return 0;
  });
  return candidates[0] ?? null;
}

/**
 * Extract source-reported VAT mass and/or volume from Lunar-style blocks/tables.
 * Never infers mass↔volume. Supports:
 * A) labelled inline
 * B) compact row with units
 * C) pdfjs header-column layout (VAT / Mass / Volume + nearby value row)
 */
export function extractVatSourceFields(pageText: string): {
  mass?: { raw: string; rawDisplay: string; kg: number };
  volume?: { raw: string; rawDisplay: string; cm3: number };
} {
  const out: {
    mass?: { raw: string; rawDisplay: string; kg: number };
    volume?: { raw: string; rawDisplay: string; cm3: number };
  } = {};

  const massPatterns = [
    /(?:visceral\s+(?:adipose\s+tissue|fat)\s*(?:\(\s*vat\s*\))?|vat)\s*mass\s*[:=]?\s*([\d.,]+)\s*(g|kg|lbs|lb)?\b/i,
    /\bvat\b[^\n]{0,80}?\bmass\b\s*[:=]?\s*([\d.,]+)\s*(g|kg|lbs|lb)?\b/i,
  ];
  for (const pattern of massPatterns) {
    const match = pageText.match(pattern);
    if (!match?.[1]) continue;
    const parsed = parseNumber(match[1]);
    if (parsed == null) continue;
    const unit = match[2];
    out.mass = {
      raw: match[1],
      rawDisplay: `${match[1]} ${massRawUnit(unit)}`.trim(),
      kg: roundTo(parsed * massUnitScale(unit), 4),
    };
    break;
  }

  const volumePatterns = [
    /(?:visceral\s+(?:adipose\s+tissue|fat)\s*(?:\(\s*vat\s*\))?|vat)\s*volume\s*[:=]?\s*([\d.,]+)\s*(cm\s*3|cm³|in\s*3|in³)?\b/i,
    /\bvat\b[^\n]{0,80}?\bvolume\b\s*[:=]?\s*([\d.,]+)\s*(cm\s*3|cm³|in\s*3|in³)?\b/i,
  ];
  for (const pattern of volumePatterns) {
    const match = pageText.match(pattern);
    if (!match?.[1]) continue;
    const parsed = parseNumber(match[1]);
    if (parsed == null) continue;
    const unit = match[2];
    out.volume = {
      raw: match[1],
      rawDisplay: `${match[1]} ${volumeRawUnit(unit)}`.trim(),
      cm3: roundTo(parsed * volumeUnitScale(unit), 4),
    };
    break;
  }

  // Compact table row: "VAT  688 g  912 cm3" (mass then volume) — only when both unit tokens exist.
  if (!out.mass || !out.volume) {
    const row = pageText.match(
      /\bvat\b\s+([\d.,]+)\s*(g|kg|lbs|lb)\s+([\d.,]+)\s*(cm\s*3|cm³|in\s*3|in³)\b/i,
    );
    if (row) {
      if (!out.mass && row[1] && row[2]) {
        const parsed = parseNumber(row[1]);
        if (parsed != null) {
          out.mass = {
            raw: row[1],
            rawDisplay: `${row[1]} ${massRawUnit(row[2])}`.trim(),
            kg: roundTo(parsed * massUnitScale(row[2]), 4),
          };
        }
      }
      if (!out.volume && row[3] && row[4]) {
        const parsed = parseNumber(row[3]);
        if (parsed != null) {
          out.volume = {
            raw: row[3],
            rawDisplay: `${row[3]} ${volumeRawUnit(row[4])}`.trim(),
            cm3: roundTo(parsed * volumeUnitScale(row[4]), 4),
          };
        }
      }
    }
  }

  // C) Lunar/pdfjs header-column layout — fill only missing fields; never invent.
  if (!out.mass || !out.volume) {
    const fromHeader = extractVatHeaderColumnLayout(pageText);
    if (!out.mass && fromHeader.mass) out.mass = fromHeader.mass;
    if (!out.volume && fromHeader.volume) out.volume = fromHeader.volume;
  }

  return out;
}

type VatColumn = "mass" | "volume";

function isMissingVatPlaceholder(token: string): boolean {
  return /^(--|—|–|-|n\/?a|\.|\.\.|null)$/i.test(token.trim());
}

function isVatMassUnitToken(token: string): boolean {
  const u = token.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "");
  return u === "g" || u === "kg" || u === "lbs" || u === "lb";
}

function isVatVolumeUnitToken(token: string): boolean {
  const u = token.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "");
  return u === "cm3" || u === "cm³" || u === "in3" || u === "in³";
}

function normalizeVatVolumeUnitToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const u = token.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "");
  if (u === "in3" || u === "in³") return "in3";
  if (u === "cm3" || u === "cm³") return "cm3";
  return undefined;
}

function normalizeVatMassUnitToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const u = token.toLowerCase().replace(/[()]/g, "").replace(/\s+/g, "");
  if (u === "g" || u === "kg" || u === "lbs" || u === "lb") return u;
  return undefined;
}

type VatHeaderColumn = "age" | "mass" | "volume" | "ignore";

/**
 * pdfjs often emits:
 *   VAT
 *   Est. Age Fat Mass (g) Volume (in³)
 *   10/18/2024 45.0 -- 12.3
 * or:
 *   Mass (g) Volume (in³)
 *   -- 12.3
 * Requires an explicit VAT context + Volume/Mass header words — never a generic Mass/Volume table.
 *
 * Mass emission rule (source-faithful, no fabrication):
 * - Column header "Mass" / "VAT Mass" → visceral_fat_mass when numeric
 * - Column header "Fat Mass" under VAT → used only to locate the Volume column;
 *   do NOT emit visceral_fat_mass from "Fat Mass" (this report class prints Fat Mass
 *   beside Volume without a dedicated VAT-mass field; Volume remains source-present)
 */
export function extractVatHeaderColumnLayout(pageText: string): {
  mass?: { raw: string; rawDisplay: string; kg: number };
  volume?: { raw: string; rawDisplay: string; cm3: number };
} {
  const lines = pageText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 0; i < lines.length; i += 1) {
    if (!/\bvat\b/i.test(lines[i]!) && !/visceral\s+adipose/i.test(lines[i]!)) continue;

    const columns: VatHeaderColumn[] = [];
    let massUnit: string | undefined;
    let volumeUnit: string | undefined;
    let valueTokens: string[] | null = null;
    /** True when the mass column was introduced as bare "Mass" / "VAT Mass", not "Fat Mass". */
    let massColumnIsVatMass = false;

    for (let j = i; j < Math.min(i + 14, lines.length); j += 1) {
      const tokens = lines[j]!.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) continue;

      const hasVatWord = tokens.some((t) => /^vat$/i.test(t) || /^visceral$/i.test(t));
      const hasMassWord = tokens.some((t) => /^mass$/i.test(t));
      const hasVolumeWord = tokens.some((t) => /^volume$/i.test(t));
      const hasAgeWord = tokens.some((t) => /^age$/i.test(t));

      // Build semantic columns from header tokens (skip unit tokens).
      if (columns.length === 0 || hasMassWord || hasVolumeWord || hasAgeWord) {
        for (let t = 0; t < tokens.length; t += 1) {
          const tok = tokens[t]!;
          const next = tokens[t + 1] ?? "";
          const prev = tokens[t - 1] ?? "";
          if (isVatMassUnitToken(tok)) {
            if (!massUnit) massUnit = normalizeVatMassUnitToken(tok);
            continue;
          }
          if (isVatVolumeUnitToken(tok)) {
            if (!volumeUnit) volumeUnit = normalizeVatVolumeUnitToken(tok);
            continue;
          }
          if (/^est\.?$/i.test(tok) || /^estimated$/i.test(tok)) {
            if (!columns.includes("ignore")) columns.push("ignore");
            continue;
          }
          if (/^age$/i.test(tok)) {
            if (!columns.includes("age")) columns.push("age");
            continue;
          }
          if (/^fat$/i.test(tok) && /^mass$/i.test(next)) {
            // "Fat Mass" — track for Volume alignment only; do not treat as VAT Mass.
            if (!columns.includes("mass")) columns.push("mass");
            massColumnIsVatMass = false;
            t += 1;
            continue;
          }
          if (/^mass$/i.test(tok) && !/^fat$/i.test(prev)) {
            if (!columns.includes("mass")) columns.push("mass");
            massColumnIsVatMass = true;
            continue;
          }
          if (/^volume$/i.test(tok)) {
            if (!columns.includes("volume")) columns.push("volume");
            continue;
          }
        }
      } else {
        for (const tok of tokens) {
          if (isVatMassUnitToken(tok) && !massUnit) massUnit = normalizeVatMassUnitToken(tok);
          if (isVatVolumeUnitToken(tok) && !volumeUnit) volumeUnit = normalizeVatVolumeUnitToken(tok);
        }
      }

      // Header line that ends with numeric values (pdfjs sometimes keeps units+value together).
      if (columns.some((c) => c === "volume" || c === "mass") && (hasVolumeWord || hasMassWord)) {
        const trailing: string[] = [];
        for (let t = tokens.length - 1; t >= 0; t -= 1) {
          const tok = tokens[t]!;
          if (parseNumber(tok) != null || isMissingVatPlaceholder(tok)) {
            trailing.unshift(tok);
            continue;
          }
          break;
        }
        if (trailing.length > 0 && trailing.some((t) => parseNumber(t) != null)) {
          valueTokens = trailing;
          break;
        }
      }

      const numericOrPlaceholder = tokens.filter(
        (t) => parseNumber(t) != null || isMissingVatPlaceholder(t),
      );
      // Allow leading row-label / date tokens before aligned numerics.
      let dataStart = 0;
      while (
        dataStart < tokens.length &&
        parseNumber(tokens[dataStart]!) == null &&
        !isMissingVatPlaceholder(tokens[dataStart]!)
      ) {
        dataStart += 1;
      }
      const dataTokens = tokens.slice(dataStart);
      const dataAreValues =
        dataTokens.length > 0 &&
        dataTokens.every((t) => parseNumber(t) != null || isMissingVatPlaceholder(t));
      const looksLikeValues =
        columns.some((c) => c === "volume" || c === "mass") &&
        numericOrPlaceholder.length > 0 &&
        dataAreValues &&
        !hasVatWord &&
        !hasVolumeWord &&
        !hasMassWord &&
        !hasAgeWord;

      if (looksLikeValues) {
        const collected = [...dataTokens];
        for (let k = j + 1; k < Math.min(j + 4, lines.length); k += 1) {
          const more = lines[k]!.split(/\s+/).filter(Boolean);
          if (
            more.length > 0 &&
            more.every((t) => parseNumber(t) != null || isMissingVatPlaceholder(t))
          ) {
            collected.push(...more);
            continue;
          }
          break;
        }
        valueTokens = collected;
        break;
      }
    }

    if (!valueTokens) continue;
    if (!columns.includes("volume") && !columns.includes("mass")) continue;

    const out: {
      mass?: { raw: string; rawDisplay: string; kg: number };
      volume?: { raw: string; rawDisplay: string; cm3: number };
    } = {};

    const dataColumns = columns.filter(
      (c): c is "age" | VatColumn => c === "mass" || c === "volume" || c === "age",
    );
    const assignable = valueTokens.filter((t) => parseNumber(t) != null || isMissingVatPlaceholder(t));

    // Single numeric under Mass+Volume → volume only (never invent mass).
    const metricCols = dataColumns.filter((c): c is VatColumn => c === "mass" || c === "volume");
    if (
      metricCols.includes("mass") &&
      metricCols.includes("volume") &&
      assignable.filter((t) => parseNumber(t) != null).length === 1
    ) {
      const only = assignable.find((t) => parseNumber(t) != null);
      if (only) {
        const parsed = parseNumber(only)!;
        const unit = volumeUnit ?? "cm3";
        out.volume = {
          raw: only,
          rawDisplay: `${only} ${volumeRawUnit(unit)}`.trim(),
          cm3: roundTo(parsed * volumeUnitScale(unit), 4),
        };
        return out;
      }
    }

    // Align left-to-right against Age/Mass/Volume (ignore age for emission).
    if (assignable.length === dataColumns.length) {
      dataColumns.forEach((col, idx) => {
        if (col === "age") return;
        const raw = assignable[idx];
        if (raw == null || isMissingVatPlaceholder(raw)) return;
        const parsed = parseNumber(raw);
        if (parsed == null) return;
        if (col === "mass") {
          if (!massColumnIsVatMass) return; // Fat Mass column: align only, do not emit.
          const unit = massUnit ?? "g";
          out.mass = {
            raw,
            rawDisplay: `${raw} ${massRawUnit(unit)}`.trim(),
            kg: roundTo(parsed * massUnitScale(unit), 4),
          };
        } else {
          const unit = volumeUnit ?? "cm3";
          out.volume = {
            raw,
            rawDisplay: `${raw} ${volumeRawUnit(unit)}`.trim(),
            cm3: roundTo(parsed * volumeUnitScale(unit), 4),
          };
        }
      });
    } else if (metricCols.length > 0 && assignable.length >= 1) {
      // Right-align to Volume (last metric) when counts differ.
      const volumeIdx = metricCols.lastIndexOf("volume");
      if (volumeIdx >= 0 && assignable.length > 0) {
        const raw = assignable[assignable.length - (metricCols.length - volumeIdx)];
        if (raw && !isMissingVatPlaceholder(raw)) {
          const parsed = parseNumber(raw);
          if (parsed != null) {
            const unit = volumeUnit ?? "cm3";
            out.volume = {
              raw,
              rawDisplay: `${raw} ${volumeRawUnit(unit)}`.trim(),
              cm3: roundTo(parsed * volumeUnitScale(unit), 4),
            };
          }
        }
      }
      const massIdx = metricCols.indexOf("mass");
      if (massColumnIsVatMass && massIdx >= 0 && assignable.length === metricCols.length) {
        const raw = assignable[massIdx];
        if (raw && !isMissingVatPlaceholder(raw)) {
          const parsed = parseNumber(raw);
          if (parsed != null) {
            const unit = massUnit ?? "g";
            out.mass = {
              raw,
              rawDisplay: `${raw} ${massRawUnit(unit)}`.trim(),
              kg: roundTo(parsed * massUnitScale(unit), 4),
            };
          }
        }
      }
    }

    if (out.mass || out.volume) return out;
  }

  return {};
}

type BmdColumn = "region" | "bmd" | "t" | "z" | "ignore";

/**
 * Total-body BMD from Lunar/pdfjs Region|BMD|T|Z style tables.
 * Emits BMD only — never T/Z. Scoped to Region+BMD headers; ignores regional BMC prose.
 */
export function extractTotalBodyBmdSourceField(pageText: string): {
  raw: string;
  rawDisplay: string;
  gPerCm2: number;
} | null {
  // Fast labelled path first (still used by synthetic fixtures).
  const labelled = [
    /(?:total\s+body\s+)?(?:tb\s*)?bmd\s*[:=]?\s*([\d.,]+)\s*(?:g\s*\/\s*cm(?:2|²)?|g\s*cm\s*-?\s*2)?/i,
    /bone\s+mineral\s+density\s*[:=]?\s*([\d.,]+)\s*(?:g\s*\/\s*cm(?:2|²)?)?/i,
  ];
  for (const pattern of labelled) {
    const match = pageText.match(pattern);
    if (!match?.[1]) continue;
    // Reject if this looks like a T/Z score capture (value with no density unit and
    // immediately preceded by T-score / Z-score) — labelled patterns already require BMD label.
    const parsed = parseNumber(match[1]);
    if (parsed == null) continue;
    // BMD is typically between ~0.5 and ~2.0 g/cm² for total body; still accept broader
    // but never claim T/Z field ids.
    return {
      raw: match[1],
      rawDisplay: `${match[1]} g/cm²`,
      gPerCm2: roundTo(parsed, 4),
    };
  }

  return extractTotalBodyBmdHeaderColumnLayout(pageText);
}

export function extractTotalBodyBmdHeaderColumnLayout(pageText: string): {
  raw: string;
  rawDisplay: string;
  gPerCm2: number;
} | null {
  const lines = pageText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (let i = 0; i < lines.length; i += 1) {
    const headerProbe = lines.slice(i, Math.min(i + 6, lines.length)).join(" ");
    if (!/\bbmd\b|\btbmd\b|bone\s+mineral\s+density/i.test(headerProbe)) continue;
    if (!/\bregion\b/i.test(headerProbe) && !/\btotal(\s+body)?\b/i.test(headerProbe)) {
      // Require Region table or Total Body bone context — avoid random BMD prose.
      if (!/bone/i.test(headerProbe)) continue;
    }

    // Build columns from a short header window that includes BMD.
    // pdfjs often fragments: Region / BMD / (g/cm²) / Young / Adult / Age / Matched
    // each on its own line — do NOT treat unit-only lines as value rows.
    const columns: BmdColumn[] = [];
    let headerEnd = i;
    for (let j = i; j < Math.min(i + 14, lines.length); j += 1) {
      const tokens = lines[j]!.split(/\s+/).filter(Boolean);
      const hasNumeric = tokens.some((t) => parseNumber(t) != null);
      const startsTotal = /^total(\s+body)?$/i.test(tokens[0] ?? "");
      const isUnitOnlyLine =
        tokens.length > 0 &&
        tokens.every(
          (t) =>
            /^g\/cm/i.test(t) ||
            /^\(?g\s*\/\s*cm/i.test(t) ||
            /^gcm/i.test(t.replace(/[()]/g, "")),
        );

      // Value row reached — stop header absorption before consuming it.
      // Require at least one numeric token (unit-only lines are still headers).
      if (
        columns.includes("bmd") &&
        hasNumeric &&
        !isUnitOnlyLine &&
        (startsTotal ||
          tokens.every((t) => parseNumber(t) != null || isMissingVatPlaceholder(t)))
      ) {
        headerEnd = j - 1;
        break;
      }
      // Regional data row (Label BMD T Z) ends header section — keep scanning for Total below.
      if (
        columns.includes("bmd") &&
        hasNumeric &&
        tokens.length >= 2 &&
        parseNumber(tokens[0]!) == null &&
        parseNumber(tokens[1]!) != null
      ) {
        headerEnd = j - 1;
        break;
      }
      const lineIsValues =
        tokens.length > 0 &&
        hasNumeric &&
        tokens.every((t) => parseNumber(t) != null || isMissingVatPlaceholder(t));
      if (lineIsValues && columns.some((c) => c === "bmd")) {
        headerEnd = j - 1;
        break;
      }
      for (let t = 0; t < tokens.length; t += 1) {
        const tok = tokens[t]!;
        const next = tokens[t + 1] ?? "";
        const two = `${tok} ${next}`.toLowerCase();
        if (/^region$/i.test(tok)) {
          if (!columns.includes("region")) columns.push("region");
          continue;
        }
        if (
          /^(bmd|tbmd)$/i.test(tok) ||
          (/^bone$/i.test(tok) && /^mineral$/i.test(next))
        ) {
          if (!columns.includes("bmd")) columns.push("bmd");
          continue;
        }
        if (
          /^t-?score$/i.test(tok) ||
          two === "young adult" ||
          /^ya$/i.test(tok) ||
          /^young$/i.test(tok)
        ) {
          if (!columns.includes("t")) columns.push("t");
          if (two === "young adult") t += 1;
          continue;
        }
        if (
          /^z-?score$/i.test(tok) ||
          two === "age matched" ||
          /^am$/i.test(tok) ||
          /^age$/i.test(tok) ||
          /^matched$/i.test(tok)
        ) {
          // "Age" alone or "Matched" alone (pdfjs fragmentation of Age Matched).
          if (/^age$/i.test(tok) && /^matched$/i.test(next)) {
            if (!columns.includes("z")) columns.push("z");
            t += 1;
            continue;
          }
          if (/^matched$/i.test(tok) && columns.includes("z")) continue;
          if (/^age$/i.test(tok) && !columns.includes("z")) {
            columns.push("z");
            continue;
          }
          if (/^matched$/i.test(tok) && !columns.includes("z")) {
            columns.push("z");
            continue;
          }
          if (!/^age$/i.test(tok) && !/^matched$/i.test(tok) && !columns.includes("z")) {
            columns.push("z");
          }
          if (two === "age matched") t += 1;
          continue;
        }
        // Lone "Adult" after Young already counted as t — ignore.
        if (/^adult$/i.test(tok)) continue;
      }
      headerEnd = j;
    }

    if (!columns.includes("bmd")) continue;
    const bmdIndex = columns.indexOf("bmd");

    // Prefer the Total / Total Body row; search far enough past regional rows.
    for (let j = headerEnd + 1; j < Math.min(headerEnd + 20, lines.length); j += 1) {
      const tokens = lines[j]!.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) continue;
      const regionToken = tokens[0] ?? "";
      const isTotalRow = /^total(\s+body)?$/i.test(regionToken) || /^total$/i.test(regionToken);
      const numericTokens = tokens.filter((t) => parseNumber(t) != null);
      if (numericTokens.length === 0) continue;

      let values: string[] = [];
      if (isTotalRow) {
        values = tokens.slice(1).filter((t) => parseNumber(t) != null || isMissingVatPlaceholder(t));
      } else if (
        columns[0] === "region" &&
        numericTokens.length >= 1 &&
        tokens.every((t) => parseNumber(t) != null || isMissingVatPlaceholder(t) || /^total$/i.test(t))
      ) {
        values = tokens.filter((t) => parseNumber(t) != null || isMissingVatPlaceholder(t));
      } else if (
        // Values-only row beneath Region|BMD|… headers (region label on its own prior line).
        tokens.every((t) => parseNumber(t) != null || isMissingVatPlaceholder(t)) &&
        numericTokens.length >= 1
      ) {
        values = tokens;
      } else {
        continue;
      }

      // Map BMD column: if columns include leading region, values align to non-region columns.
      const dataColumns = columns[0] === "region" ? columns.slice(1) : columns;
      const bmdDataIndex =
        dataColumns[0] === "bmd"
          ? 0
          : Math.max(0, bmdIndex - (columns[0] === "region" ? 1 : 0));

      // Prefer explicit index; if values length matches data columns, use index.
      let raw: string | undefined;
      if (values.length === dataColumns.length) {
        raw = values[bmdDataIndex];
      } else if (dataColumns[0] === "bmd" && values[0]) {
        // Common: BMD is first numeric column on the Total row.
        raw = values[0];
      } else if (values.length === 1 && dataColumns.includes("bmd")) {
        raw = values[0];
      }

      if (!raw || isMissingVatPlaceholder(raw)) continue;
      const parsed = parseNumber(raw);
      if (parsed == null) continue;
      // Guard: total-body BMD is a density (~0.2–2.5), not a typical T/Z (~-4..4) alone
      // when multiple columns exist — if we took index 0 from BMD-first headers, OK.
      // If T/Z somehow selected a value outside density range and BMD column missing, skip.
      if (parsed < 0.2 || parsed > 3.5) continue;

      return {
        raw,
        rawDisplay: `${raw} g/cm²`,
        gPerCm2: roundTo(parsed, 4),
      };
    }
  }

  return null;
}

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
  // VAT: dedicated source-only extractor (mass and volume independent; never inferred).
  for (const page of input.pages) {
    const vat = extractVatSourceFields(page.text);
    if (vat.mass) {
      pushField({
        metricId: "visceral_fat_mass",
        region: "total",
        rawLabel: "VAT Mass",
        rawValue: vat.mass.rawDisplay,
        normalizedValue: vat.mass.kg,
        unit: "kg",
        pageNumber: page.pageNumber,
        confidence: CONFIDENCE_LABELLED,
      });
    }
    if (vat.volume) {
      pushField({
        metricId: "visceral_fat_volume",
        region: "total",
        rawLabel: "VAT Volume",
        rawValue: vat.volume.rawDisplay,
        normalizedValue: vat.volume.cm3,
        unit: "cm3",
        pageNumber: page.pageNumber,
        confidence: CONFIDENCE_LABELLED,
      });
    }
  }

  // A/G: prefer full Android/Gynoid labels and highest source decimal precision.
  for (const page of input.pages) {
    const ag = selectBestAndroidGynoidMatch(page.text);
    if (!ag) continue;
    pushField({
      metricId: "android_gynoid_ratio",
      region: "total",
      rawLabel: ag.rawLabel,
      rawValue: ag.raw,
      normalizedValue: roundTo(ag.value, 4),
      unit: "ratio",
      pageNumber: page.pageNumber,
      confidence: CONFIDENCE_LABELLED,
    });
    break;
  }

  // Total-body BMD: labelled + Region|BMD|T|Z header-column layouts (T/Z never emitted).
  for (const page of input.pages) {
    const bmd = extractTotalBodyBmdSourceField(page.text);
    if (!bmd) continue;
    pushField({
      metricId: "bone_mineral_density",
      region: "total",
      rawLabel: "Total Body BMD",
      rawValue: bmd.rawDisplay,
      normalizedValue: bmd.gPerCm2,
      unit: "g_per_cm2",
      pageNumber: page.pageNumber,
      confidence: CONFIDENCE_LABELLED,
    });
    break;
  }

  for (const labelled of LABELLED_METRICS) {
    // VAT / A/G / BMD handled above with layout-aware extractors.
    if (
      labelled.metricId === "visceral_fat_mass" ||
      labelled.metricId === "visceral_fat_volume" ||
      labelled.metricId === "android_gynoid_ratio" ||
      labelled.metricId === "bone_mineral_density"
    ) {
      continue;
    }
    for (const page of input.pages) {
      const match = page.text.match(labelled.pattern);
      if (!match?.[1]) continue;
      const parsed = parseNumber(match[1]);
      const scale =
        typeof labelled.scale === "function" ? labelled.scale(match[2]) : labelled.scale;
      const unitSuffix = labelled.rawUnitFromGroup?.(match[2]);
      const rawValue =
        unitSuffix && unitSuffix.length > 0 ? `${match[1]} ${unitSuffix}`.trim() : match[1];
      pushField({
        metricId: labelled.metricId,
        region: labelled.region,
        rawLabel: match[0].split(/[:=]/)[0]?.trim() || match[0].trim(),
        rawValue,
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
