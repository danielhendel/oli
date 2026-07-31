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
export const PDF_TEXT_EXTRACTOR_VERSION = "1.0.0";

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
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
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
      const text = content.items
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\s{2,}/g, "  ")
        .trim();
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
