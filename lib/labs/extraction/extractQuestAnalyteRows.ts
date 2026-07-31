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

function parseColumns(trimmed: string): {
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

  if (idx < cols.length && !FLAG_LIKE.test(cols[idx]!)) {
    rawRange = cols[idx]!;
    idx += 1;
  }

  if (idx < cols.length && FLAG_LIKE.test(cols[idx]!)) {
    rawFlag = cols[idx]!;
  }

  return { rawLabel, rawResult, rawUnit, rawRange, rawFlag };
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
          reviewStatus: "pending",
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
          reviewStatus: "pending",
        });
        return;
      }

      if (alias.matchMethod === "unmatched" || !alias.canonicalMetricId) {
        unmatched.push({
          id: candidateId,
          rawAnalyteLabel: rawLabel,
          rawResult,
          reason: alias.confidence > 0 && alias.confidence < 0.5 ? "ambiguous_alias" : "unmatched_alias",
          provenance,
          confidence: Math.min(parsedValue.confidence, alias.confidence),
          reviewStatus: "pending",
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
        reviewStatus: "pending",
      });
    });
  }

  return { panels, results, unmatched, warnings };
}
