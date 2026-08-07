/**
 * Quest report page segmentation (Phase 3D-A).
 * Pure text transforms — preserve page numbers for provenance.
 */

export type SegmentedPage = {
  pageNumber: number;
  lines: string[];
  /** Lines after repeated header/footer removal (still provenance-safe). */
  bodyLines: string[];
};

export type SegmentedReport = {
  pages: SegmentedPage[];
  panels: { name: string; startPage: number; lineIndex: number }[];
  metadataLines: string[];
  cardioIqPages: number[];
  historicalColumnHints: { pageNumber: number; line: string }[];
};

const HEADER_FOOTER_RE =
  /^(page\s+\d+\s+of\s+\d+|quest\s+diagnostics|directlabs|confidential|continued|report\s+status)/i;

const PANEL_RE =
  /^(basic\s+health\s+profile|lipid\s+panel|comprehensive\s+metabolic(?:\s+panel)?|cmp\b|cbc\b|complete\s+blood\s+count|thyroid(?:\s+panel)?|hormone(?:\s+panel)?|cardio\s*iq|hepatitis(?:\s+panel)?|antibody(?:\s+panel)?|sars(?:-cov-2)?(?:\s+(?:antibody|serology))(?:\s+panel)?|covid(?:-19)?(?:\s+(?:antibody|serology))(?:\s+panel)?|iron\s+(?:panel|studies)|electrolyte(?:\s+panel)?|testosterone|bioavailable|hepatic(?:\s+function)?(?:\s+panel)?|liver(?:\s+panel)?|urinalysis|urine\s+analysis|(?:psa|prostate(?:\s+specific\s+antigen)?)(?:\s+panel)?|calculated(?:\s+values?)?)/i;

/** Strip trailing Quest performing-lab codes from panel headers (e.g. NL1, AMD, EZ). */
const PANEL_TRAILING_LAB_CODE_RE = /\s+(?:AMD|NL\d*|Z\d{1,3}M|EZ|TP|JS|QW)$/i;

const HISTORICAL_HINT_RE = /\b(previous|prior|historical|last\s+result|prior\s+result)\b/i;

/**
 * Segment multi-page Quest text into pages, panels, and metadata blocks.
 */
export function segmentQuestReportText(pages: readonly { pageNumber: number; text: string }[]): SegmentedReport {
  const headerCounts = new Map<string, number>();
  for (const page of pages) {
    const first = page.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
    if (first) headerCounts.set(first, (headerCounts.get(first) ?? 0) + 1);
  }
  const repeatedHeaders = new Set(
    [...headerCounts.entries()].filter(([, n]) => n >= 2 && pages.length >= 2).map(([h]) => h),
  );

  const segmentedPages: SegmentedPage[] = pages.map((page) => {
    const lines = page.text.split(/\r?\n/).map((l) => l.replace(/\t/g, " ").trimEnd());
    const bodyLines = lines.filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (repeatedHeaders.has(t)) return false;
      if (HEADER_FOOTER_RE.test(t) && t.length < 80) return false;
      return true;
    });
    return { pageNumber: page.pageNumber, lines, bodyLines };
  });

  const panels: SegmentedReport["panels"] = [];
  const metadataLines: string[] = [];
  const cardioIqPages: number[] = [];
  const historicalColumnHints: SegmentedReport["historicalColumnHints"] = [];

  for (const page of segmentedPages) {
    page.bodyLines.forEach((line, lineIndex) => {
      const t = line.trim();
      if (
        /collected(?:\s+date)?\s*:|received:|reported:|fasting:|specimen:|report\s+status:/i.test(t)
      ) {
        metadataLines.push(t);
      } else if (/patient\s+information/i.test(t)) {
        if (!/patient\s+id|dob|date\s+of\s+birth|phone|address|ssn/i.test(t)) {
          metadataLines.push(t);
        }
      }
      // Panel headers only — never analyte value rows that share a panel keyword prefix.
      // Require a free-standing numeric token (not lab codes like NL1) to reject value rows.
      const hasStandaloneResultToken =
        /(?:^|\s)(?:<=|>=|<|>|≤|≥)?-?\d+(?:\.\d+)?(?:\s|$)/.test(t);
      if (PANEL_RE.test(t) && !hasStandaloneResultToken) {
        const rawName = t.split(/\s{2,}/)[0]!.trim().replace(PANEL_TRAILING_LAB_CODE_RE, "").trim();
        panels.push({ name: rawName, startPage: page.pageNumber, lineIndex });
      }
      if (/cardio\s*iq|cleveland\s+heartlab/i.test(t)) {
        if (!cardioIqPages.includes(page.pageNumber)) cardioIqPages.push(page.pageNumber);
      }
      if (HISTORICAL_HINT_RE.test(t)) {
        historicalColumnHints.push({ pageNumber: page.pageNumber, line: t });
      }
      void lineIndex;
    });
  }

  return { pages: segmentedPages, panels, metadataLines, cardioIqPages, historicalColumnHints };
}
