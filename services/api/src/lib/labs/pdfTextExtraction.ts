/**
 * Server-only PDF text-layer extraction adapter (Phase 3D-A).
 * Never logs raw page text or health values.
 */

export type PdfTextPage = { pageNumber: number; text: string };

export type PdfTextExtractionResult = {
  pages: PdfTextPage[];
  pageCount: number;
  textCharCount: number;
  warningCodes: string[];
  parser: { id: string; version: string };
};

export const PDF_TEXT_EXTRACTOR_ID = "pdfjs_text_v1";
export const PDF_TEXT_EXTRACTOR_VERSION = "1.1.0";

const MAX_PAGES = 40;
const MAX_CHARS = 500_000;
const DEFAULT_TIMEOUT_MS = 30_000;

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
        getTextContent: () => Promise<{ items: { str?: string }[] }>;
      }>;
      destroy: () => Promise<void>;
    }>;
  };
};

let pdfjsModulePromise: Promise<PdfjsModule> | null = null;

/** Lazily load the ESM-only pdfjs-dist legacy Node build via dynamic import. */
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as Promise<PdfjsModule>;
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
 */
export async function extractPdfTextPages(
  bytes: Uint8Array,
  opts?: { timeoutMs?: number },
): Promise<PdfTextExtractionResult> {
  const warningCodes: string[] = [];
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // pdfjs-dist 4.x ships ESM-only builds — dynamic import from this CommonJS
  // module is the supported interop path (also keeps mobile bundles from pulling pdfjs).
  const run = async (): Promise<PdfTextExtractionResult> => {
    const pdfjs = await loadPdfjs();
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    });
    const doc = await loadingTask.promise;
    const pageCount = Math.min(doc.numPages, MAX_PAGES);
    if (doc.numPages > MAX_PAGES) warningCodes.push("page_count_mismatch");

    const pages: PdfTextPage[] = [];
    let textCharCount = 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Preserve visual lines via pdfjs hasEOL / y-deltas. Joining with spaces
      // alone collapses Quest column layouts and breaks row grammar.
      const text = reconstructPdfPageText(
        content.items as {
          str?: string;
          hasEOL?: boolean;
          transform?: number[];
        }[],
      );
      textCharCount += text.length;
      if (textCharCount > MAX_CHARS) {
        warningCodes.push("partial_page_text");
        pages.push({ pageNumber: i, text: text.slice(0, Math.max(0, text.length - (textCharCount - MAX_CHARS))) });
        break;
      }
      pages.push({ pageNumber: i, text });
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
