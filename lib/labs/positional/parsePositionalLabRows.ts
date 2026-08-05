/**
 * Positional Quest row reconstruction (deterministic, panel-profile aware).
 * Does not invent analyte identity — only assigns column regions from x positions.
 */
import type { PdfTextItem } from "./pdfTextItem";
import { groupPdfTextItemsIntoRows, joinPdfRowText } from "./pdfTextItem";
import {
  defaultQuestPanelProfile,
  getQuestPanelProfile,
  type LabPanelLayoutProfile,
} from "./questPanelProfiles";
import { parseLabResultValue } from "../extraction/parseLabResultValue";
import { parseLabUnitCandidate } from "../extraction/parseLabUnit";
import { matchLabAnalyteAlias } from "../extraction/matchLabAnalyteAlias";
import type { LabResultValue } from "@oli/contracts";

export type PositionalLabRowCandidate = {
  page: number;
  rowText: string;
  analyteLabel: string | null;
  rawResult: string | null;
  rawFlag: string | null;
  rawUnit: string | null;
  rawReferenceRange: string | null;
  rawHistorical: string | null;
  result: LabResultValue | null;
  normalizedUnit: string | null;
  unitKnown: boolean;
  canonicalMetricId: string | null;
  panelProfileId: string;
  sourceLocator: string;
};

function regionText(
  row: readonly PdfTextItem[],
  region: { xMin: number; xMax: number },
  pageWidthHint: number,
): string {
  const scale = pageWidthHint > 0 ? 100 / pageWidthHint : 1;
  return row
    .filter((item) => {
      const xPct = item.x * scale;
      return xPct >= region.xMin && xPct < region.xMax;
    })
    .map((i) => i.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageWidth(items: readonly PdfTextItem[]): number {
  let max = 0;
  for (const i of items) max = Math.max(max, i.x + i.width);
  return max > 0 ? max : 612;
}

function isHeaderOrFooter(rowText: string, profile: LabPanelLayoutProfile): boolean {
  const upper = rowText.toUpperCase();
  if (profile.knownHeaders.some((h) => upper.includes(h))) return true;
  if (profile.knownFooters.some((f) => upper.includes(f))) return true;
  if (profile.knownRiskTables.some((r) => upper === r || upper.startsWith(`${r} `))) return true;
  return false;
}

/**
 * Reconstruct lab rows from positional items for a single page/profile.
 */
export function parsePositionalLabRows(args: {
  items: readonly PdfTextItem[];
  panelLabel?: string | null;
  profile?: LabPanelLayoutProfile | null;
}): PositionalLabRowCandidate[] {
  const profile =
    args.profile ?? getQuestPanelProfile(args.panelLabel) ?? defaultQuestPanelProfile();
  const rows = groupPdfTextItemsIntoRows(args.items, profile.rowYTolerance);
  const out: PositionalLabRowCandidate[] = [];

  for (const row of rows) {
    if (row.length === 0) continue;
    const page = row[0]!.page;
    const width = pageWidth(row);
    const rowText = joinPdfRowText(row);
    if (!rowText || isHeaderOrFooter(rowText, profile)) continue;

    const analyteLabel = regionText(row, profile.columns.analyteLabel, width) || null;
    const rawResult = regionText(row, profile.columns.result, width) || null;
    const rawFlag = regionText(row, profile.columns.flag, width) || null;
    let rawUnit = regionText(row, profile.columns.unit, width) || null;
    const rawReferenceRange = regionText(row, profile.columns.referenceRange, width) || null;
    const rawHistorical = regionText(row, profile.columns.historicalResult, width) || null;

    // HbA1c alignment: unit region captured "Hgb" while range holds "% of total".
    if (
      analyteLabel &&
      /hba1c|a1c|hemoglobin\s*a1c/i.test(analyteLabel) &&
      rawUnit &&
      /^hgb$/i.test(rawUnit) &&
      rawReferenceRange &&
      /%/.test(rawReferenceRange)
    ) {
      rawUnit = "%";
    }

    if (!analyteLabel || !rawResult) continue;

    const parsedResult = parseLabResultValue(rawResult);
    const parsedUnit = parseLabUnitCandidate(rawUnit);
    const alias = matchLabAnalyteAlias(analyteLabel);

    out.push({
      page,
      rowText,
      analyteLabel,
      rawResult,
      rawFlag,
      rawUnit,
      rawReferenceRange,
      rawHistorical: rawHistorical || null,
      result: parsedResult.ok ? parsedResult.value : null,
      normalizedUnit: parsedUnit.normalizedUnit,
      unitKnown: parsedUnit.known,
      canonicalMetricId: alias.canonicalMetricId,
      panelProfileId: profile.id,
      sourceLocator: `positional:p${page}:x${Math.round(row[0]!.x)}:y${Math.round(row[0]!.y)}`,
    });
  }

  return out;
}
