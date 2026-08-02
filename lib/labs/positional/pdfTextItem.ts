/**
 * Bounded positional PDF text model (server processing only).
 * Never expose raw positional text to the mobile client. Never log report text.
 */

export type PdfTextItem = {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const PDF_POSITIONAL_EXTRACTOR_ID = "pdfjs_positional_v1";
export const PDF_POSITIONAL_EXTRACTOR_VERSION = "1.0.0";

/** Soft caps for in-memory processing — prefer transient use. */
export const PDF_POSITIONAL_MAX_PAGES = 40;
export const PDF_POSITIONAL_MAX_ITEMS = 25_000;
export const PDF_POSITIONAL_MAX_SERIALIZED_CHARS = 1_500_000;

export type PdfPositionalExtractionResult = {
  items: PdfTextItem[];
  pageCount: number;
  itemCount: number;
  warningCodes: string[];
  parser: { id: string; version: string };
  /** Retention: positional items are processing-transient unless minimized locators are stored. */
  retention: "transient_processing";
};

/**
 * Group text items into visual rows by page + y proximity.
 * Pure — no mutation of input.
 */
export function groupPdfTextItemsIntoRows(
  items: readonly PdfTextItem[],
  yTolerance = 2.5,
): PdfTextItem[][] {
  const byPage = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    const list = byPage.get(item.page) ?? [];
    list.push(item);
    byPage.set(item.page, list);
  }
  const rows: PdfTextItem[][] = [];
  const pages = [...byPage.keys()].sort((a, b) => a - b);
  for (const page of pages) {
    const pageItems = [...(byPage.get(page) ?? [])].sort((a, b) => b.y - a.y || a.x - b.x);
    let current: PdfTextItem[] = [];
    let rowY: number | null = null;
    for (const item of pageItems) {
      if (rowY !== null && Math.abs(item.y - rowY) > yTolerance) {
        if (current.length > 0) rows.push(current.sort((a, b) => a.x - b.x));
        current = [];
        rowY = null;
      }
      current.push(item);
      rowY = rowY === null ? item.y : (rowY * (current.length - 1) + item.y) / current.length;
    }
    if (current.length > 0) rows.push(current.sort((a, b) => a.x - b.x));
  }
  return rows;
}

/** Join a row's text left-to-right with single spaces (structural only). */
export function joinPdfRowText(row: readonly PdfTextItem[]): string {
  return row
    .map((i) => i.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
