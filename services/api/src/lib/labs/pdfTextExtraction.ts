/**
 * Server-only PDF text-layer extraction adapter (Phase 3D-A).
 * Never logs raw page text or health values.
 */

import {
  PDF_POSITIONAL_EXTRACTOR_ID,
  PDF_POSITIONAL_EXTRACTOR_VERSION,
  PDF_POSITIONAL_MAX_ITEMS,
  PDF_POSITIONAL_MAX_PAGES,
  type PdfPositionalExtractionResult,
  type PdfTextItem,
} from "../../../../../lib/labs/positional/pdfTextItem";

export type PdfTextPage = { pageNumber: number; text: string };

export type PdfTextExtractionResult = {
  pages: PdfTextPage[];
  pageCount: number;
  textCharCount: number;
  warningCodes: string[];
  parser: { id: string; version: string };
  /** Transient positional items when requested — not for mobile client. */
  textItems?: PdfTextItem[];
};

export const PDF_TEXT_EXTRACTOR_ID = "pdfjs_text_v1";
export const PDF_TEXT_EXTRACTOR_VERSION = "1.2.0";

const MAX_PAGES = PDF_POSITIONAL_MAX_PAGES;
const MAX_CHARS = 500_000;
const DEFAULT_TIMEOUT_MS = 30_000;

type PdfjsTextItem = {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
  height?: number;
};

type PdfjsModule = {
  getDocument: (src: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    verbosity?: number;
  }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: PdfjsTextItem[] }>;
        getViewport: (opts: { scale: number }) => { width: number; height: number };
      }>;
      destroy: () => Promise<void>;
    }>;
  };
};

let pdfjsModulePromise: Promise<PdfjsModule> | null = null;

/** Lazily load the ESM-only pdfjs-dist legacy Node build via native dynamic import.
 * TypeScript CommonJS emit rewrites `import()` to `require()`, which cannot load `.mjs`.
 * `Function` keeps a real dynamic import at runtime on Cloud Run / Node 20.
 */
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsModulePromise) {
    const dynamicImport = new Function(
      "specifier",
      "return import(specifier)",
    ) as (specifier: string) => Promise<PdfjsModule>;
    pdfjsModulePromise = dynamicImport("pdfjs-dist/legacy/build/pdf.mjs").then((mod) => {
      const resolved = (mod as { default?: PdfjsModule }).default ?? mod;
      return resolved as PdfjsModule;
    });
  }
  return pdfjsModulePromise;
}

/**
 * Rebuild page text with newlines from pdfjs text items.
 * Prefer hasEOL; fall back to y-transform jumps when hasEOL is absent.
 */
export function reconstructPdfPageText(
  items: readonly { str?: string; hasEOL?: boolean; transform?: number[] }[],
): string {
  const Y_TOLERANCE = 2.5;
  const useHasEol = items.some((item) => item.hasEOL === true);
  const lines: string[] = [];
  let current = "";
  let lastY: number | null = null;

  for (const item of items) {
    const str = typeof item.str === "string" ? item.str : "";
    const y = Array.isArray(item.transform) && typeof item.transform[5] === "number" ? item.transform[5] : null;

    if (!useHasEol && lastY !== null && y !== null && Math.abs(y - lastY) > Y_TOLERANCE) {
      if (current.length > 0) {
        lines.push(current.replace(/[ \t]+$/g, ""));
      }
      current = "";
    }

    current += str;
    if (y !== null) lastY = y;

    if (useHasEol && item.hasEOL) {
      lines.push(current.replace(/[ \t]+$/g, ""));
      current = "";
    }
  }

  if (current.length > 0) {
    lines.push(current.replace(/[ \t]+$/g, ""));
  }

  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  let text = nonEmpty.join("\n");
  if (!useHasEol && nonEmpty.length <= 1 && items.length > 1) {
    // y-jumps may still have produced lines; only fall back when truly flat.
    const ySet = new Set(
      items
        .map((item) =>
          Array.isArray(item.transform) && typeof item.transform[5] === "number"
            ? Math.round(item.transform[5])
            : null,
        )
        .filter((v): v is number => v !== null),
    );
    if (ySet.size <= 1) {
      text = items
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .join(" ");
    }
  }

  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, "  ")
    .trim();
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("PDF_TEXT_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Extract text pages from a PDF buffer using pdfjs-dist (server-only).
 * When includePositional is true, also returns bounded PdfTextItem[] for verification.
 * Positional items are processing-transient — do not ship to mobile clients.
 */
export async function extractPdfTextPages(
  bytes: Uint8Array,
  opts?: { timeoutMs?: number; includePositional?: boolean },
): Promise<PdfTextExtractionResult> {
  const warningCodes: string[] = [];
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const includePositional = opts?.includePositional === true;

  // pdfjs-dist 4.x ships ESM-only builds — dynamic import from this CommonJS
  // module is the supported interop path (also keeps mobile bundles from pulling pdfjs).
  const run = async (): Promise<PdfTextExtractionResult> => {
    const pdfjs = await loadPdfjs();
    // pdfjs may transfer/detach the input ArrayBuffer — always pass a copy.
    const data = bytes.byteLength > 0 ? bytes.slice() : bytes;
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    const pageCount = Math.min(doc.numPages, MAX_PAGES);
    if (doc.numPages > MAX_PAGES) warningCodes.push("page_count_mismatch");

    const pages: PdfTextPage[] = [];
    const textItems: PdfTextItem[] = [];
    let textCharCount = 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = content.items as PdfjsTextItem[];
      // Preserve visual lines via pdfjs hasEOL / y-deltas. Joining with spaces
      // alone collapses Quest column layouts and breaks row grammar.
      const text = reconstructPdfPageText(items);
      textCharCount += text.length;
      if (textCharCount > MAX_CHARS) {
        warningCodes.push("partial_page_text");
        pages.push({ pageNumber: i, text: text.slice(0, Math.max(0, text.length - (textCharCount - MAX_CHARS))) });
        break;
      }
      pages.push({ pageNumber: i, text });

      if (includePositional) {
        for (const item of items) {
          if (textItems.length >= PDF_POSITIONAL_MAX_ITEMS) {
            warningCodes.push("positional_item_cap");
            break;
          }
          const str = typeof item.str === "string" ? item.str : "";
          if (!str) continue;
          const transform = Array.isArray(item.transform) ? item.transform : [];
          const x = typeof transform[4] === "number" ? transform[4] : 0;
          const y = typeof transform[5] === "number" ? transform[5] : 0;
          const width = typeof item.width === "number" ? item.width : Math.max(0, str.length * 4);
          const height = typeof item.height === "number" ? item.height : 8;
          textItems.push({ text: str, page: i, x, y, width, height });
        }
      }
    }

    if (textCharCount < 40) {
      warningCodes.push("scanned_pdf_no_text");
    }

    await doc.destroy().catch(() => undefined);

    return {
      pages,
      pageCount: doc.numPages,
      textCharCount,
      warningCodes,
      parser: { id: PDF_TEXT_EXTRACTOR_ID, version: PDF_TEXT_EXTRACTOR_VERSION },
      ...(includePositional
        ? {
            textItems,
          }
        : {}),
    };
  };

  try {
    return await withTimeout(run(), timeoutMs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF_TEXT_FAILED";
    if (message === "PDF_TEXT_TIMEOUT") {
      return {
        pages: [],
        pageCount: 0,
        textCharCount: 0,
        warningCodes: ["partial_page_text"],
        parser: { id: PDF_TEXT_EXTRACTOR_ID, version: PDF_TEXT_EXTRACTOR_VERSION },
      };
    }
    // Encrypted / corrupt — fail closed without logging contents.
    return {
      pages: [],
      pageCount: 0,
      textCharCount: 0,
      warningCodes: message.toLowerCase().includes("password") || message.toLowerCase().includes("encrypt")
        ? ["encrypted_pdf"]
        : ["unsupported_layout"],
      parser: { id: PDF_TEXT_EXTRACTOR_ID, version: PDF_TEXT_EXTRACTOR_VERSION },
    };
  }
}

/**
 * Extract positional text items only (bounded, transient processing).
 */
export async function extractPdfPositionalTextItems(
  bytes: Uint8Array,
  opts?: { timeoutMs?: number },
): Promise<PdfPositionalExtractionResult> {
  const result = await extractPdfTextPages(bytes, { ...opts, includePositional: true });
  return {
    items: result.textItems ?? [],
    pageCount: result.pageCount,
    itemCount: result.textItems?.length ?? 0,
    warningCodes: result.warningCodes,
    parser: { id: PDF_POSITIONAL_EXTRACTOR_ID, version: PDF_POSITIONAL_EXTRACTOR_VERSION },
    retention: "transient_processing",
  };
}
