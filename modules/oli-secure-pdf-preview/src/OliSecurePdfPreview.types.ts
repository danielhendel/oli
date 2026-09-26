/**
 * Narrow TypeScript contract for the Oli secure PDFKit viewer.
 * Never carries paths, filenames, native error text, or file metadata.
 */

export type SecurePdfPreviewRequest = {
  readonly localUri: string;
  readonly title?: string;
};

export type SecurePdfPreviewSafeReasonCode =
  | "native_preview_unavailable"
  | "invalid_file_uri"
  | "outside_allowed_cache_root"
  | "file_missing"
  | "pdf_invalid"
  | "pdf_locked"
  | "pdf_empty"
  | "presenter_unavailable"
  | "preview_already_presented"
  | "presentation_failed"
  | "dismissal_failed"
  | "unknown_native_preview_failure";

export type SecurePdfPreviewResult =
  | {
      readonly ok: true;
      readonly method: "pdfkit";
      readonly settlement: "dismissed";
      readonly deleteImmediately: true;
    }
  | {
      readonly ok: false;
      readonly safeReasonCode: SecurePdfPreviewSafeReasonCode;
    };
