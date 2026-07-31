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
  /^(lipid\s+panel|comprehensive\s+metabolic\s+panel|cmp|cbc|complete\s+blood\s+count|thyroid|hormone|cardio\s*iq|hepatitis|antibody|iron|electrolyte)/i;

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
      if (/collected:|received:|reported:|fasting:|specimen:|patient\s+information/i.test(t)) {
        // Skip lines that look like patient identity blocks beyond labels we need.
        if (/patient\s+id|dob|date\s+of\s+birth|phone|address|ssn/i.test(t)) return;
        metadataLines.push(t);
      }
      if (PANEL_RE.test(t)) {
        panels.push({ name: t, startPage: page.pageNumber, lineIndex });
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
