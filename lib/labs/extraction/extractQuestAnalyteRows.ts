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
import type { SegmentedReport } from "./segmentQuestReport";
import { stableHexId } from "./stableHexId";

export type ExtractQuestRowsResult = {
  panels: LabPanelCandidate[];
  results: LabResultCandidate[];
  unmatched: LabUnmatchedCandidate[];
  warnings: { code: LabExtractionWarningCode; message: string; candidateId?: string; pageNumber?: number }[];
};

const VALUE_LIKE =
  /^(?:(?:<=|>=|<|>|≤|≥)\s*)?-?\d+(?:\.\d+)?$|^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|INCOMPUTABLE|N\/A)$|^Pattern\s+[A-Za-z0-9]+$/i;

const UNIT_LIKE = /^(?:[A-Za-z%µμ][A-Za-z%µμ^0-9./()]{0,24}|Thousand\/uL|10\^3\/uL|mL\/min(?:\/1\.73m2)?)$/i;

const FLAG_LIKE = /^(?:[HLNA]|HH|LL|HIGH|LOW|NORMAL|ABNORMAL|OPTIMAL|MODERATE|CRITICAL)$/i;

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

  let idx = 1;
  const rawResult = cols[idx]!;
  if (!VALUE_LIKE.test(rawResult)) return null;
  idx += 1;

  let rawUnit: string | null = null;
  let rawRange: string | null = null;
  let rawFlag: string | null = null;

  if (idx < cols.length && UNIT_LIKE.test(cols[idx]!) && !FLAG_LIKE.test(cols[idx]!)) {
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

  // Ignore trailing performing-lab codes.
  void idx;

  return { rawLabel, rawResult, rawUnit, rawRange, rawFlag };
}

/**
 * Single-space Quest layouts (common in pdfjs hasEOL reconstruction).
 * Walk label tokens until the first value-like token; unit/flag from the right.
 */
function parseColumnsSingleSpace(trimmed: string): {
  rawLabel: string;
  rawResult: string;
  rawUnit: string | null;
  rawRange: string | null;
  rawFlag: string | null;
} | null {
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  let end = tokens.length - 1;
  let rawFlag: string | null = null;
  let rawUnit: string | null = null;

  if (end >= 0 && LAB_CODE_LIKE.test(tokens[end]!)) {
    end -= 1;
  }
  if (end >= 0 && FLAG_LIKE.test(tokens[end]!) && !UNIT_LIKE.test(tokens[end]!)) {
    rawFlag = tokens[end]!;
    end -= 1;
  }
  if (end >= 0 && LAB_CODE_LIKE.test(tokens[end]!)) {
    end -= 1;
  }
  if (end >= 0 && UNIT_LIKE.test(tokens[end]!) && !FLAG_LIKE.test(tokens[end]!)) {
    rawUnit = tokens[end]!;
    end -= 1;
  }

  let valueIdx = -1;
  for (let i = 0; i <= end; i++) {
    if (VALUE_LIKE.test(tokens[i]!)) {
      valueIdx = i;
      break;
    }
  }
  if (valueIdx <= 0) return null;

  const rawLabel = tokens.slice(0, valueIdx).join(" ");
  if (!/^[A-Za-z]/.test(rawLabel)) return null;
  if (/^(test|analyte|result|reference|flag|units?)$/i.test(rawLabel)) return null;
  // Avoid swallowing narrative / footnote lines as analytes.
  if (rawLabel.split(/\s+/).length > 10) return null;
  if (/^(consistent with|please note|note:|see |for additional)/i.test(rawLabel)) return null;

  const rawResult = tokens[valueIdx]!;
  const rangeTokens = tokens.slice(valueIdx + 1, end + 1);
  const rawRange = rangeTokens.length > 0 ? rangeTokens.join(" ") : null;

  // Require unit, range, or qualitative value so narrative footnotes do not become rows.
  const qualitative = /^(?:POSITIVE|NEGATIVE|DETECTED|NOT DETECTED|REACTIVE|NON-REACTIVE|NOT APPLICABLE|NOT ORDERED|NOT PERFORMED|N\/A)$/i.test(
    rawResult,
  );
  if (!rawUnit && !rawRange && !qualitative) return null;

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
      joinedLines.push(page.bodyLines[i]!);
    }

    joinedLines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) return;
      if (/collected:|received:|reported:|fasting:|specimen:|report status:/i.test(trimmed)) return;
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

      // Panel headers are single-column names — skip as analyte rows.
      if (
        /^(lipid\s+panel|comprehensive\s+metabolic\s+panel|cmp|cbc|complete\s+blood\s+count|thyroid|hormone|cardio\s*iq|hepatitis|antibody|iron|electrolyte)/i.test(
          trimmed,
        ) &&
        !/\s{2,}\S/.test(trimmed)
      ) {
        return;
      }

      const parsedCols = parseColumns(trimmed);
      if (!parsedCols) return;

      const { rawLabel, rawResult, rawUnit, rawRange, rawFlag } = parsedCols;
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

      const provenance = {
        sourceDocumentId: args.documentId,
        sourcePage: page.pageNumber,
        sourceLocator: locator,
        sourceChecksumSha256: args.checksumSha256,
        parserId: args.parserId,
        parserVersion: args.parserVersion,
        extractionVersion: args.extractionVersion,
        panelName: panelName,
        resultRole: isHistorical ? ("historical_column" as const) : ("current" as const),
      };

      if (isHistorical) {
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

      const parsedValue = parseLabResultValue(rawResult);
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
