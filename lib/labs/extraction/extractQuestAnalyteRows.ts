/**
 * Quest analyte row extraction (Phase 3D-A).
 * Column-split grammar for digitally generated Quest-family text layouts.
 */

import type {
  LabExtractionWarningCode,
  LabPanelCandidate,
  LabResultCandidate,
  LabUnmatchedCandidate,
} from "@oli/contracts";
import { matchLabAnalyteAlias } from "./matchLabAnalyteAlias";
import { parseLabFlagCandidate } from "./parseLabFlag";
import { parseLabReferenceRange } from "./parseLabReferenceRange";
import { parseLabResultValue } from "./parseLabResultValue";
import { parseLabUnitCandidate } from "./parseLabUnit";
import {
  assignSourceValueRole,
  isCardioIqContext,
  isCardioIqPatternLegend,
  isReferenceSourceValueRole,
} from "./cardioIqValueRole";
import type { SegmentedReport } from "./segmentQuestReport";
import { stableHexId } from "./stableHexId";

export type ExtractQuestRowsResult = {
  panels: LabPanelCandidate[];
  results: LabResultCandidate[];
  unmatched: LabUnmatchedCandidate[];
  warnings: { code: LabExtractionWarningCode; message: string; candidateId?: string; pageNumber?: number }[];
};

const VALUE_LIKE =
  /^(?:(?:<=|>=|<|>|≤|≥)\s*)?-?\d+(?:\.\d+)?$|^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A|NONE SEEN|YELLOW|CLEAR|CLOUDY|TURBID|STRAW|AMBER)$|^Pattern\s+[A-Za-z0-9]+$/i;

const EQUALITY_NUMERIC = /^-?\d+(?:\.\d+)?$/;

const UNIT_LIKE =
  /^(?:nmol\/min\/mL|Thousand\/uL|10\^3\/uL|mL\/min(?:\/1\.73m2)?|[A-Za-z%µμ][A-Za-z%µμ^0-9./()]{0,24})$/i;

const FLAG_LIKE = /^(?:[HLNA]|HH|LL|HIGH|LOW|NORMAL|ABNORMAL|OPTIMAL|MODERATE|CRITICAL)$/i;

/** Quest assay / method abbreviations that must never be treated as units. */
const ASSAY_METHOD_LIKE =
  /^(?:IA|MS|LCMS|LC\/MS|LC-MS\/MS|ECLIA|RIA|CLIA|ELISA|IFA|CMIA|ICMA|NEPH|CALC|CALCULATED)$/i;

function stableCandidateId(parts: string[]): string {
  return `cand_${stableHexId(parts, 24)}`;
}

function currentPanelName(report: SegmentedReport, pageNumber: number, lineIndex: number): string | null {
  let best: { name: string; startPage: number; lineIndex: number } | null = null;
  for (const p of report.panels) {
    if (p.startPage < pageNumber || (p.startPage === pageNumber && p.lineIndex <= lineIndex)) {
      best = p;
    }
  }
  return best?.name ?? null;
}

/** Trailing Quest performing-lab abbreviations (not clinical flags). */
const LAB_CODE_LIKE = /^(?:AMD|NL\d*|Z\d{1,3}M|EZ|TP|JS|QW)$/i;

function isUnitToken(token: string): boolean {
  if (/^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A)$/i.test(token)) {
    return false;
  }
  if (/^[A-Za-z]{2}$/.test(token) && !/^(?:na|k|cl|ca|fe|iu|pg|fl|ml|dl|ul|eq|mg)$/i.test(token)) {
    return false;
  }
  return UNIT_LIKE.test(token) && !FLAG_LIKE.test(token) && !ASSAY_METHOD_LIKE.test(token);
}

/**
 * Prefer the first equality numeric / qualitative / pattern token as the current result.
 * Cardio IQ summary rows with optimal/high threshold pairs (e.g. <200 … >=240) are not current.
 * A single inequality (e.g. Mercury <4) remains a valid current censored result.
 */
function selectCurrentResultIndex(tokens: readonly string[], endInclusive: number): number {
  const valueIdxs: number[] = [];
  for (let i = 0; i <= endInclusive; i++) {
    if (VALUE_LIKE.test(tokens[i]!)) valueIdxs.push(i);
  }
  for (const i of valueIdxs) {
    const t = tokens[i]!;
    if (
      EQUALITY_NUMERIC.test(t) ||
      /^Pattern\s+/i.test(t) ||
      /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A)$/i.test(
        t,
      )
    ) {
      return i;
    }
  }
  const inequalities = valueIdxs.filter((i) => /^(?:<=|>=|<|>|≤|≥)/.test(tokens[i]!));
  if (inequalities.length === 0) return -1;
  if (inequalities.length === 1) return inequalities[0]!;
  const first = inequalities[0]!;
  const second = inequalities[1]!;
  const firstTok = tokens[first]!;
  const secondTok = tokens[second]!;
  // Classic Cardio IQ threshold pair without a current equality value.
  if (/^(?:<=|<|≤)/.test(firstTok) && /^(?:>=|>|≥)/.test(secondTok)) {
    return -1;
  }
  if (/^(?:>=|>|≥)/.test(firstTok) && /^(?:<=|<|≤)/.test(secondTok)) {
    return -1;
  }
  // First inequality is the censored current result; later inequalities belong to ranges.
  return first;
}

function looksLikeAnalyteNameNumber(tokens: readonly string[], valueIdx: number): boolean {
  const tok = tokens[valueIdx] ?? "";
  const next = tokens[valueIdx + 1] ?? "";
  // INTERLEUKIN 6 (IL 6), IA — number is part of the analyte name.
  if (/^\(/.test(next) || /^\(IL/i.test(next) || /^IL[\d\-)]*/i.test(next)) return true;
  // INTERLEUKIN 6 1.89 — integer name digit before the true decimal result.
  if (
    EQUALITY_NUMERIC.test(tok) &&
    !tok.includes(".") &&
    EQUALITY_NUMERIC.test(next) &&
    next.includes(".")
  ) {
    return true;
  }
  // Name-embedded integers for known numeral analytes before unit/range/result.
  const labelPrefix = tokens.slice(0, valueIdx).join(" ");
  if (
    EQUALITY_NUMERIC.test(tok) &&
    !tok.includes(".") &&
    /interleukin|vitamin\s*[abd]|factor\s*[ivx0-9]|hla-b27|coenzyme\s*q10|omega|il-?\d/i.test(
      labelPrefix,
    ) &&
    (VALUE_LIKE.test(next) ||
      isUnitToken(next) ||
      /^(?:<=|>=|<|>|≤|≥)/.test(next) ||
      /^IL/i.test(next) ||
      !next)
  ) {
    return true;
  }
  // SARS-CoV-2 / antibody label numerals (e.g. SARS CoV 2 AB IGG).
  if (
    EQUALITY_NUMERIC.test(tok) &&
    !tok.includes(".") &&
    /sars|\bcov\b|co\s*v|\bab\b|\bantibody\b|\bigg\b|\bigm\b/i.test(`${labelPrefix} ${next}`)
  ) {
    return true;
  }
  return false;
}

/**
 * Name-only analyte lines awaiting a specimen-qualified result row
 * (e.g. INTERLEUKIN 6 (IL 6), EZ → SERUM 1.89 …).
 * Embedded name numbers must not block pending hold.
 */
function shouldHoldPendingAnalyteLabel(trimmed: string): boolean {
  if (!/^[A-Za-z]/.test(trimmed)) return false;
  if (
    /^(consistent with|please note|note:|see |for additional|relative\s+risk|client\s*#|account\s*#)/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 12) return false;
  if (parseColumns(trimmed)) return false;

  let end = tokens.length - 1;
  while (end >= 0 && (LAB_CODE_LIKE.test(tokens[end]!) || ASSAY_METHOD_LIKE.test(tokens[end]!))) {
    end -= 1;
  }
  let valueIdx = selectCurrentResultIndex(tokens, end);
  while (valueIdx > 0 && looksLikeAnalyteNameNumber(tokens, valueIdx)) {
    let found = -1;
    for (let i = valueIdx + 1; i <= end; i++) {
      if (!VALUE_LIKE.test(tokens[i]!)) continue;
      if (looksLikeAnalyteNameNumber(tokens, i)) continue;
      if (
        EQUALITY_NUMERIC.test(tokens[i]!) ||
        /^Pattern\s+/i.test(tokens[i]!) ||
        /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A)$/i.test(
          tokens[i]!,
        )
      ) {
        found = i;
        break;
      }
    }
    valueIdx = found;
    if (valueIdx < 0) break;
  }
  return valueIdx <= 0;
}

function parseColumnsMultiSpace(trimmed: string): {
  rawLabel: string;
  rawResult: string;
  rawUnit: string | null;
  rawRange: string | null;
  rawFlag: string | null;
} | null {
  const cols = trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (cols.length < 2) return null;

  const rawLabel = cols[0]!;
  if (!/^[A-Za-z]/.test(rawLabel)) return null;
  if (/^(test|analyte|result|reference|flag|units?)$/i.test(rawLabel)) return null;

  const valueIdx = selectCurrentResultIndex(cols, cols.length - 1);
  if (valueIdx <= 0) return null;

  const rawResult = cols[valueIdx]!;
  let idx = valueIdx + 1;

  let rawUnit: string | null = null;
  let rawRange: string | null = null;
  let rawFlag: string | null = null;

  if (idx < cols.length && isUnitToken(cols[idx]!)) {
    rawUnit = cols[idx]!;
    idx += 1;
  }

  if (idx < cols.length && !FLAG_LIKE.test(cols[idx]!) && !LAB_CODE_LIKE.test(cols[idx]!)) {
    rawRange = cols[idx]!;
    idx += 1;
  }

  if (idx < cols.length && FLAG_LIKE.test(cols[idx]!)) {
    rawFlag = cols[idx]!;
    idx += 1;
  }

  void idx;

  const qualitative = /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|N\/A)$/i.test(
    rawResult,
  );
  if (!rawUnit && !rawRange && !qualitative && !/^Pattern\s+/i.test(rawResult)) return null;

  return { rawLabel, rawResult, rawUnit, rawRange, rawFlag };
}

/**
 * Single-space Quest layouts (common in pdfjs hasEOL reconstruction).
 * Walk label tokens until the first value-like token; unit/flag from the right.
 */
function coalescePatternTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i]!;
    const next = tokens[i + 1];
    const prev = out[out.length - 1] ?? tokens[i - 1] ?? "";
    // "LDL PATTERN B A Pattern …" → label keeps PATTERN; first A/B after PATTERN is current.
    if (/^pattern$/i.test(cur) && next && /^[AB]$/i.test(next) && /^ldl$/i.test(prev)) {
      out.push(cur);
      out.push(`Pattern ${next.toUpperCase()}`);
      i += 1;
      // Skip a following lone reference letter (e.g. "A") before a "Pattern" legend token.
      const after = tokens[i + 1];
      const after2 = tokens[i + 2];
      if (after && /^[AB]$/i.test(after) && after2 && /^pattern$/i.test(after2)) {
        i += 1;
      }
      continue;
    }
    // Standalone "Pattern B" result token — only coalesce A/B phenotype letters.
    if (/^pattern$/i.test(cur) && next && /^[AB]$/i.test(next)) {
      out.push(`Pattern ${next.toUpperCase()}`);
      i += 1;
      continue;
    }
    out.push(cur);
  }
  return out;
}

function parseColumnsSingleSpace(trimmed: string): {
  rawLabel: string;
  rawResult: string;
  rawUnit: string | null;
  rawRange: string | null;
  rawFlag: string | null;
} | null {
  const tokens = coalescePatternTokens(trimmed.split(/\s+/).filter(Boolean));
  if (tokens.length < 2) return null;

  let end = tokens.length - 1;
  let rawFlag: string | null = null;
  let rawUnit: string | null = null;

  if (end >= 0 && LAB_CODE_LIKE.test(tokens[end]!)) {
    end -= 1;
  }
  if (end >= 0 && FLAG_LIKE.test(tokens[end]!) && !isUnitToken(tokens[end]!)) {
    rawFlag = tokens[end]!;
    end -= 1;
  }
  if (end >= 0 && LAB_CODE_LIKE.test(tokens[end]!)) {
    end -= 1;
  }
  if (end >= 0 && ASSAY_METHOD_LIKE.test(tokens[end]!)) {
    // Method suffix on analyte-name-only lines (e.g. INTERLEUKIN 6 (IL 6), IA).
    end -= 1;
  }
  if (end >= 0 && isUnitToken(tokens[end]!)) {
    rawUnit = tokens[end]!;
    end -= 1;
  }

  let valueIdx = selectCurrentResultIndex(tokens, end);
  // Skip analyte-embedded numbers such as "INTERLEUKIN 6 (IL 6)".
  while (valueIdx > 0 && looksLikeAnalyteNameNumber(tokens, valueIdx)) {
    let found = -1;
    for (let i = valueIdx + 1; i <= end; i++) {
      if (!VALUE_LIKE.test(tokens[i]!)) continue;
      if (looksLikeAnalyteNameNumber(tokens, i)) continue;
      if (
        EQUALITY_NUMERIC.test(tokens[i]!) ||
        /^Pattern\s+/i.test(tokens[i]!) ||
        /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A)$/i.test(
          tokens[i]!,
        )
      ) {
        found = i;
        break;
      }
    }
    valueIdx = found;
    if (valueIdx < 0) break;
  }
  if (valueIdx <= 0) return null;

  const rawLabel = tokens.slice(0, valueIdx).join(" ");
  if (!/^[A-Za-z]/.test(rawLabel)) return null;
  if (/^(test|analyte|result|reference|flag|units?)$/i.test(rawLabel)) return null;
  // Avoid swallowing narrative / footnote lines as analytes.
  if (rawLabel.split(/\s+/).length > 10) return null;
  if (/^(consistent with|please note|note:|see |for additional)/i.test(rawLabel)) return null;

  const rawResult = tokens[valueIdx]!;
  const mid = tokens.slice(valueIdx + 1, end + 1);
  // Quest often places H/L between result and range: VALUE FLAG RANGE UNIT
  let midFlag: string | null = null;
  const rangeTokens: string[] = [];
  for (const t of mid) {
    if (!midFlag && FLAG_LIKE.test(t) && !isUnitToken(t)) {
      midFlag = t;
      continue;
    }
    rangeTokens.push(t);
  }
  if (!rawFlag && midFlag) rawFlag = midFlag;
  const rawRange = rangeTokens.length > 0 ? rangeTokens.join(" ") : null;

  // Require unit, range, or qualitative value so narrative footnotes do not become rows.
  const qualitative = /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|N\/A)$/i.test(
    rawResult,
  );
  if (!rawUnit && !rawRange && !qualitative && !/^Pattern\s+/i.test(rawResult)) return null;

  return { rawLabel, rawResult, rawUnit, rawRange, rawFlag };
}

function parseColumns(trimmed: string): {
  rawLabel: string;
  rawResult: string;
  rawUnit: string | null;
  rawRange: string | null;
  rawFlag: string | null;
} | null {
  return parseColumnsMultiSpace(trimmed) ?? parseColumnsSingleSpace(trimmed);
}

/** Test-only export for column grammar fixtures. */
export function parseColumnsForTest(trimmed: string) {
  return parseColumns(trimmed);
}

const PANEL_HEADER_ONLY =
  /^(?:basic\s+health\s+profile|lipid\s+panel|comprehensive\s+metabolic(?:\s+panel)?|cmp|cbc(?:\s*\(|$)|complete\s+blood\s+count|thyroid(?:\s+panel)?|hormone(?:\s+panel)?|cardio\s*iq|hepatitis(?:\s+panel)?|antibody(?:\s+panel)?|sars(?:-cov-2)?(?:\s+(?:antibody|serology))(?:\s+panel)?|covid(?:-19)?(?:\s+(?:antibody|serology))(?:\s+panel)?|iron\s+(?:panel|studies)|electrolyte(?:\s+panel)?|testosterone|bioavailable|hepatic(?:\s+function)?(?:\s+panel)?|liver(?:\s+panel)?|urinalysis|urine\s+analysis|(?:psa|prostate(?:\s+specific\s+antigen)?)(?:\s+panel)?|calculated(?:\s+values?)?)$/i;

const TABLE_HEADER_LINE = /^(?:test\s+name|analyte|result|reference\s+(?:range|interval)|flag|units?)(?:\s|$)/i;

const SHORT_ANALYTE_SUFFIX = /^(?:igg|igm|iga|ab|total|free|direct|indirect)$/i;

const STACKED_META_LINE =
  /^(?:desired\s+(?:range|result)|reference\s+range|unit\s+of\s+measure)\s*:/i;

const PATIENT_IDENTITY_LINE =
  /^[A-Z][A-Z'`.-]+,\s*[A-Z][A-Za-z'`.-]+(?:\s+\([A-Z0-9]+\))?\s*$/;

const STACKED_SKIP_LINE =
  /^(?:page\s+\d+\s+of\s+\d+|next\s+steps|martin[- ]hopkins|https?:\/\/|www\.)/i;

function looksLikeLabelContinuation(line: string): boolean {
  const t = line.trim();
  if (!t || PANEL_HEADER_ONLY.test(t)) return false;
  if (TABLE_HEADER_LINE.test(t)) return false;
  // Section subheaders (e.g. HEPATITIS C ANTIBODY) must not absorb the following row.
  if (/\b(?:antibody|panel|profile|guide|comment)\s*$/i.test(t) && !parseColumns(t)) return false;
  if (/^(?:sars-cov-2|antibody\s+panel|interpretation|comment|guide|hormones?)$/i.test(t)) return false;
  if (parseColumns(t)) return false;
  return /^[A-Za-z(]/.test(t);
}

function splitRangeAndUnit(value: string): { range: string; unit: string | null } {
  const trimmed = value.trim();
  const unitMatch = /\s+([A-Za-z%µμ][A-Za-z%µμ^0-9./()]{0,24}(?:\s*\([^)]*\))?)\s*$/.exec(trimmed);
  if (unitMatch && unitMatch.index! > 0) {
    return {
      range: trimmed.slice(0, unitMatch.index).trim(),
      unit: unitMatch[1]!.replace(/\s*\([^)]*\)\s*$/, "").trim() || null,
    };
  }
  return { range: trimmed, unit: null };
}

function parseStackedValueLine(trimmed: string): {
  rawResult: string;
  rawFlag: string | null;
} | null {
  const numericFlag = /^(-?\d+(?:\.\d+)?)\s+(HIGH|LOW|HH|LL|NORMAL|ABNORMAL|H|L)$/i.exec(trimmed);
  if (numericFlag) {
    return { rawResult: numericFlag[1]!, rawFlag: numericFlag[2]!.toUpperCase() };
  }
  if (EQUALITY_NUMERIC.test(trimmed)) {
    return { rawResult: trimmed, rawFlag: null };
  }
  if (
    /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A|NONE SEEN|YELLOW|CLEAR|CLOUDY|TURBID|STRAW|AMBER)$/i.test(
      trimmed,
    )
  ) {
    return { rawResult: trimmed, rawFlag: null };
  }
  return null;
}

function isStackedAnalyteLabel(trimmed: string): boolean {
  if (!trimmed || trimmed.length < 2) return false;
  if (PANEL_HEADER_ONLY.test(trimmed)) return false;
  if (TABLE_HEADER_LINE.test(trimmed)) return false;
  if (STACKED_META_LINE.test(trimmed)) return false;
  if (PATIENT_IDENTITY_LINE.test(trimmed)) return false;
  if (STACKED_SKIP_LINE.test(trimmed)) return false;
  if (/^(?:note:|please note|for additional|relative\s+risk|client\s*#|account\s*#|performing\s+site)/i.test(trimmed)) {
    return false;
  }
  if (trimmed.split(/\s+/).length > 12) return false;
  if (parseColumns(trimmed)) return false;
  if (parseStackedValueLine(trimmed)) return false;
  return shouldHoldPendingAnalyteLabel(trimmed);
}

function synthesizeStackedColumnRow(args: {
  label: string;
  rawResult: string;
  rawUnit: string | null;
  rawRange: string | null;
  rawFlag: string | null;
}): string {
  const parts = [args.label, args.rawResult];
  if (args.rawUnit) parts.push(args.rawUnit);
  if (args.rawRange) parts.push(args.rawRange);
  if (args.rawFlag) parts.push(args.rawFlag);
  return parts.join("  ");
}

function hasStackedDesiredRangeLayout(bodyLines: string[]): boolean {
  return bodyLines.some((line) => {
    const t = line.trim();
    return STACKED_META_LINE.test(t) || /^desired\s+(?:range|result)\s*$/i.test(t);
  });
}

/** Reconstruct DirectLabs stacked Desired Range / result blocks into pseudo column rows. */
function reconstructStackedDesiredRangeLines(bodyLines: string[]): string[] {
  const out: string[] = [];
  let pending: { label: string; rawRange: string | null; rawUnit: string | null } | null = null;

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (STACKED_SKIP_LINE.test(trimmed) || PATIENT_IDENTITY_LINE.test(trimmed)) {
      pending = null;
      continue;
    }
    if (/^(?:note:|this report is|results verified|do not use for self-diagnosis)/i.test(trimmed)) {
      pending = null;
      continue;
    }
    if (PANEL_HEADER_ONLY.test(trimmed)) {
      pending = null;
      out.push(line);
      continue;
    }

    const metaMatch = STACKED_META_LINE.exec(trimmed);
    if (metaMatch) {
      if (!pending) continue;
      const payload = trimmed.slice(metaMatch[0].length).trim();
      if (/^unit\s+of\s+measure/i.test(metaMatch[0])) {
        pending.rawUnit = splitRangeAndUnit(payload).range.replace(/\s*\([^)]*\)\s*$/, "").trim() || payload;
      } else {
        const { range, unit } = splitRangeAndUnit(payload);
        pending.rawRange = range;
        if (unit && !pending.rawUnit) pending.rawUnit = unit;
      }
      continue;
    }

    const stackedValue = parseStackedValueLine(trimmed);
    if (stackedValue && pending) {
      out.push(
        synthesizeStackedColumnRow({
          label: pending.label,
          rawResult: stackedValue.rawResult,
          rawUnit: pending.rawUnit,
          rawRange: pending.rawRange,
          rawFlag: stackedValue.rawFlag,
        }),
      );
      pending = null;
      continue;
    }

    if (parseColumns(trimmed)) {
      const parsed = parseColumns(trimmed)!;
      if (pending) {
        const canSuffixJoin =
          SHORT_ANALYTE_SUFFIX.test(parsed.rawLabel) &&
          looksLikeLabelContinuation(pending.label) &&
          /sars|\bcov\b|antibody|\bab\b/i.test(pending.label);
        const canSpecimenJoin = /^(?:serum|plasma|urine|blood|whole blood)$/i.test(parsed.rawLabel.trim());
        if (canSuffixJoin || canSpecimenJoin) {
          out.push(
            synthesizeStackedColumnRow({
              label: `${pending.label} ${parsed.rawLabel}`.replace(/\s+/g, " ").trim(),
              rawResult: parsed.rawResult,
              rawUnit: parsed.rawUnit ?? pending.rawUnit,
              rawRange: parsed.rawRange ?? pending.rawRange,
              rawFlag: parsed.rawFlag,
            }),
          );
          pending = null;
          continue;
        }
      }
      out.push(line);
      pending = null;
      continue;
    }

    if (isStackedAnalyteLabel(trimmed)) {
      pending = { label: trimmed.replace(/,\s*$/, ""), rawRange: null, rawUnit: null };
      continue;
    }

    pending = null;
    out.push(line);
  }

  return out;
}

/** Join pdfjs-fragmented analyte label lines that split mid-row before the result token. */
function joinFragmentedAnalyteLines(bodyLines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < bodyLines.length; i++) {
    const cur = bodyLines[i]!.trimEnd();
    const curTrim = cur.trim();
    const next = bodyLines[i + 1]?.trim() ?? "";
    const nextParsed = next ? parseColumns(next) : null;

    // Prefer not to swallow a complete next row — unless it is a short suffix
    // continuation of a SARS/antibody label (SARS CoV 2 AB + IGG POSITIVE).
    if (nextParsed) {
      const canSuffixJoin =
        SHORT_ANALYTE_SUFFIX.test(nextParsed.rawLabel) &&
        looksLikeLabelContinuation(curTrim) &&
        /sars|\bcov\b|antibody|\bab\b/i.test(curTrim) &&
        Boolean(parseColumns(`${curTrim} ${next}`));
      if (canSuffixJoin) {
        out.push(`${curTrim} ${next}`);
        i += 1;
        continue;
      }
      out.push(bodyLines[i]!);
      continue;
    }

    if (curTrim && next && looksLikeLabelContinuation(curTrim) && !TABLE_HEADER_LINE.test(next)) {
      const twoLine = `${curTrim} ${next}`;
      if (parseColumns(twoLine)) {
        out.push(twoLine);
        i += 1;
        continue;
      }
    }

    out.push(bodyLines[i]!);
  }
  return out;
}

export function extractQuestAnalyteRows(args: {
  report: SegmentedReport;
  documentId: string;
  checksumSha256: string;
  parserId: string;
  parserVersion: string;
  extractionVersion: string;
}): ExtractQuestRowsResult {
  const panels: LabPanelCandidate[] = args.report.panels.map((p) => ({
    id: `panel_${stableHexId([p.name, String(p.startPage)], 12)}`,
    name: p.name,
    sourcePage: p.startPage,
  }));
  const panelByName = new Map(panels.map((p) => [p.name, p]));

  const results: LabResultCandidate[] = [];
  const unmatched: LabUnmatchedCandidate[] = [];
  const warnings: ExtractQuestRowsResult["warnings"] = [];

  const historicalPages = new Set(args.report.historicalColumnHints.map((h) => h.pageNumber));

  for (const page of args.report.pages) {
    // Join wrapped analyte labels that end with hyphen or are clearly continued.
    const joinedLines: string[] = [];
    for (let i = 0; i < page.bodyLines.length; i++) {
      const cur = page.bodyLines[i]!.trimEnd();
      const next = page.bodyLines[i + 1]?.trim() ?? "";
      if (/[A-Za-z]-$/.test(cur.trim()) && next && /^[A-Za-z]/.test(next)) {
        // Preserve hyphen so LDL- + CHOLESTEROL → LDL-CHOLESTEROL
        joinedLines.push(`${cur.trim()}${next}`);
        i += 1;
        continue;
      }
      // Lp-PLA2 / activity units split across lines: "nmol/" + "min/mL"
      if (/nmol\/\s*$/i.test(cur.trim()) && /^min\/mL\b/i.test(next)) {
        joinedLines.push(`${cur.trim()}${next}`);
        i += 1;
        continue;
      }
      joinedLines.push(page.bodyLines[i]!);
    }

    const useStackedLayout = hasStackedDesiredRangeLayout(joinedLines);
    const stackedLines = useStackedLayout
      ? reconstructStackedDesiredRangeLines(joinedLines)
      : joinedLines;
    const reconstructedLines = joinFragmentedAnalyteLines(stackedLines);

    /** Prior analyte-name line awaiting a specimen-qualified result row (e.g. IL-6 → SERUM 1.89). */
    let pendingAnalyteLabel: string | null = null;

    reconstructedLines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) return;
      if (/collected:|received:|reported:|fasting:|specimen:|report status:/i.test(trimmed)) return;
      // Never emit patient identity headers as analyte candidates (PHI).
      if (PATIENT_IDENTITY_LINE.test(trimmed)) return;
      if (/patient\s+id|dob|date of birth|phone|address|requisition/i.test(trimmed)) return;
      // Client/account metadata and interpretive legends are not analyte rows.
      if (/^client\s*#|^account\s*#|^patient\s*#/i.test(trimmed)) return;
      if (
        /^(deficiency|insufficiency|optimal|desirable|reference\s+range|risk)\s*:/i.test(trimmed) ||
        /^risk:\s*/i.test(trimmed)
      ) {
        return;
      }
      if (/quest\s+diagnostics|cleveland\s+heartlab|performing\s+lab/i.test(trimmed) && /,\s*[A-Z]{2}\b/.test(trimmed)) {
        return;
      }
      if (/relative\s+risk|cardiovascular\s+risk\.|for\s+clinical\s+purposes|questassured/i.test(trimmed)) {
        return;
      }
      if (/^value\s*\(in\s+the\s+range|^option\b/i.test(trimmed)) return;
      if (/^test\s+name/i.test(trimmed)) return;
      if (TABLE_HEADER_LINE.test(trimmed) && !/^[A-Za-z].*\d/.test(trimmed)) return;
      if (/^desired\s+(?:range|result)\s*:/i.test(trimmed)) return;
      if (/^comment$/i.test(trimmed)) return;
      if (/^note\s+\d/i.test(trimmed)) return;
      if (/^interpretation\s+guide/i.test(trimmed)) return;
      if (/^guide$/i.test(trimmed)) return;
      if (/^index\s+value/i.test(trimmed)) return;
      if (/^this test has not been|^this test has been authorized/i.test(trimmed)) return;
      if (/^<\d+\.\d+/i.test(trimmed) || /^>=\d+\.\d+/i.test(trimmed)) return;
      if (/^\d+\.\d+\s*-\s*\d+\.\d+/i.test(trimmed) && /indeterminate|negative|positive/i.test(trimmed)) {
        return;
      }

      // Panel headers are single-column names — skip as analyte rows.
      // Do not match analyte labels such as "IRON, TOTAL" via a bare "iron" prefix.
      if (
        /^(lipid\s+panel|comprehensive\s+metabolic(?:\s+panel)?|cmp|cbc(?:\s*\(|$)|complete\s+blood\s+count|thyroid\s+panel|hormone\s+panel|cardio\s*iq|hepatitis\s+panel|antibody\s+panel|iron\s+(?:panel|studies)|electrolyte\s+panel)\b/i.test(
          trimmed,
        ) &&
        selectCurrentResultIndex(trimmed.split(/\s+/).filter(Boolean), trimmed.split(/\s+/).filter(Boolean).length - 1) < 0
      ) {
        return;
      }

      const parsedCols = parseColumns(trimmed);
      if (!parsedCols) {
        // Name-only analyte lines (method suffix, parenthetical alias, no current value).
        // Ignore analyte-embedded numbers so IL-6 name lines still become pending.
        if (shouldHoldPendingAnalyteLabel(trimmed)) {
          pendingAnalyteLabel = trimmed.replace(/,\s*$/, "");
        } else {
          pendingAnalyteLabel = null;
        }
        return;
      }

      let rawLabel = parsedCols.rawLabel;
      const { rawResult, rawUnit, rawRange, rawFlag } = parsedCols;
      if (
        pendingAnalyteLabel &&
        /^(serum|plasma|urine|blood|whole blood)$/i.test(rawLabel.trim())
      ) {
        rawLabel = `${pendingAnalyteLabel} ${rawLabel}`.replace(/\s+/g, " ").trim();
        pendingAnalyteLabel = null;
      } else {
        pendingAnalyteLabel = null;
      }
      if (/patient|dob|phone|address|requisition|account\s*#/i.test(rawLabel)) return;

      const panelName = currentPanelName(args.report, page.pageNumber, lineIndex);
      const panel = panelName ? panelByName.get(panelName) : undefined;
      const locator = `p${page.pageNumber}:L${lineIndex}:${rawLabel.slice(0, 24)}`;
      const candidateId = stableCandidateId([
        args.documentId,
        args.checksumSha256,
        String(page.pageNumber),
        locator,
        rawLabel,
        rawResult,
      ]);

      const isHistorical =
        historicalPages.has(page.pageNumber) &&
        /\b(previous|prior|historical)\b/i.test(trimmed + " " + (panelName ?? ""));

      const cardioIq = isCardioIqContext({
        panelName,
        pageNumber: page.pageNumber,
        cardioIqPages: args.report.cardioIqPages,
      });

      const parsedValue = parseLabResultValue(rawResult);
      const patternLegend =
        cardioIq &&
        isCardioIqPatternLegend({
          rawResult,
          rawRange,
          rawUnit,
          lineText: trimmed,
        });
      const sourceValueRole = parsedValue.ok
        ? assignSourceValueRole({
            isCardioIq: cardioIq,
            isHistorical,
            isPatternLegend: patternLegend,
            result: parsedValue.value,
          })
        : patternLegend
          ? ("reference_general" as const)
          : ("unknown" as const);

      const provenance = {
        sourceDocumentId: args.documentId,
        sourcePage: page.pageNumber,
        sourceLocator: locator,
        sourceChecksumSha256: args.checksumSha256,
        parserId: args.parserId,
        parserVersion: args.parserVersion,
        extractionVersion: args.extractionVersion,
        panelName: panelName,
        resultRole: isHistorical
          ? ("historical_column" as const)
          : isReferenceSourceValueRole(sourceValueRole)
            ? ("summary" as const)
            : ("current" as const),
        sourceValueRole,
      };

      if (isHistorical || sourceValueRole === "historical_result") {
        unmatched.push({
          id: candidateId,
          rawAnalyteLabel: rawLabel,
          rawResult,
          reason: "historical_column",
          provenance,
          confidence: 0.7,
          reviewStatus: "pending_review",
        });
        warnings.push({
          code: "duplicate_candidate",
          message: "Historical result column was not imported as a current result.",
          candidateId,
          pageNumber: page.pageNumber,
        });
        return;
      }

      // Cardio IQ reference thresholds never become current candidates.
      if (isReferenceSourceValueRole(sourceValueRole) || (cardioIq && sourceValueRole === "unknown")) {
        unmatched.push({
          id: candidateId,
          rawAnalyteLabel: rawLabel,
          rawResult,
          reason: "non_result_risk_category",
          provenance,
          confidence: 0.9,
          reviewStatus: "unresolved",
          resolutionKind: "risk_category",
        });
        return;
      }

      const unit = parseLabUnitCandidate(rawUnit);
      const rangeParsed = parseLabReferenceRange(rawRange);
      const flag = parseLabFlagCandidate(rawFlag);
      const alias = matchLabAnalyteAlias(rawLabel);

      const candidateWarnings: LabExtractionWarningCode[] = [];
      if (!parsedValue.ok) candidateWarnings.push("ambiguous_value");
      if (!unit.known && unit.rawUnit) candidateWarnings.push("ambiguous_unit");
      if (rangeParsed && rangeParsed.structured.kind === "raw_only") {
        candidateWarnings.push("ambiguous_reference_range");
      }
      if (flag.normalized === "unknown") candidateWarnings.push("ambiguous_flag");
      if (alias.matchMethod === "unmatched") candidateWarnings.push("ambiguous_analyte");
      if (alias.requiresReview || parsedValue.confidence < 0.85 || unit.confidence < 0.85) {
        candidateWarnings.push("low_confidence");
      }

      for (const code of candidateWarnings) {
        warnings.push({
          code,
          message: code.replace(/_/g, " "),
          candidateId,
          pageNumber: page.pageNumber,
        });
      }

      if (!parsedValue.ok) {
        unmatched.push({
          id: candidateId,
          rawAnalyteLabel: rawLabel,
          rawResult,
          reason: "unsupported_result_type",
          provenance,
          confidence: parsedValue.confidence,
          reviewStatus: "pending_review",
        });
        return;
      }

      if (alias.matchMethod === "unmatched" || !alias.canonicalMetricId) {
        // confidence 0.35 = multi-metric ambiguity; 0.2 = no catalog hit (alias missing).
        const reason =
          alias.confidence >= 0.3 && alias.confidence < 0.5
            ? ("ambiguous_alias" as const)
            : ("unmatched_alias" as const);
        unmatched.push({
          id: candidateId,
          rawAnalyteLabel: rawLabel,
          rawResult,
          reason,
          provenance,
          confidence: Math.min(parsedValue.confidence, alias.confidence),
          reviewStatus: "pending_review",
          rawUnit,
        });
        return;
      }

      const confidence = Math.min(
        parsedValue.confidence,
        unit.confidence,
        alias.confidence,
        flag.confidence,
        rangeParsed?.confidence ?? 1,
      );

      results.push({
        id: candidateId,
        rawAnalyteLabel: rawLabel,
        rawResult,
        result: parsedValue.value,
        unit,
        rawReferenceRange: rawRange,
        structuredReferenceRange: rangeParsed?.structured ?? null,
        flag,
        panelId: panel?.id ?? null,
        aliasMatch: {
          canonicalMetricId: alias.canonicalMetricId,
          matchMethod: alias.matchMethod,
          aliasVersion: alias.aliasVersion,
          confidence: alias.confidence,
          requiresReview: alias.requiresReview,
        },
        method: null,
        laboratory: null,
        provenance,
        confidence,
        warnings: [...new Set(candidateWarnings)],
        reviewStatus: "pending_review",
      });
    });
  }

  return { panels, results, unmatched, warnings };
}
