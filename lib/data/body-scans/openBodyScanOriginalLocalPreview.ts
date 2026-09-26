/**
 * Shared original-report local preview helper for Body Scan originals.
 * Used by the production View Original hook and the DEV cache harness.
 *
 * Stage 3E V1 (approved architecture):
 * - iOS: OliSecurePdfPreview (Apple PDFKit via local Expo module) only.
 * - Never WebBrowser / Linking / expo-sharing / Quick Look for local Body Scan PDFs.
 * - Non-iOS: safe unsupported (no Android viewer claim in Stage 3E V1).
 */

import { Platform } from "react-native";
import {
  isOliSecurePdfPreviewAvailable,
  presentSecurePdfPreview,
  type SecurePdfPreviewSafeReasonCode,
} from "oli-secure-pdf-preview";

export type BodyScanLocalPreviewMethod =
  | "pdfkit"
  | "web_browser"
  | "linking"
  | "system_preview"
  | "existing_secure_viewer";

export type BodyScanLocalPreviewSettlement = "dismissed" | "launch_only";

export type BodyScanLocalPreviewSafeReason =
  | "local_pdf_invalid"
  | "preview_method_unsupported"
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
  | "unknown_native_preview_failure"
  | "web_browser_open_failed"
  | "linking_open_failed"
  | "system_preview_open_failed"
  | "unknown_open_failure";

export type BodyScanLocalPreviewResult =
  | {
      readonly ok: true;
      readonly opened: true;
      readonly method: BodyScanLocalPreviewMethod;
      readonly settlement: BodyScanLocalPreviewSettlement;
      readonly deleteImmediately: boolean;
    }
  | {
      readonly ok: false;
      readonly opened: false;
      readonly deleteImmediately: true;
      readonly safeReasonCode: BodyScanLocalPreviewSafeReason;
      /** Last method that failed before giving up (when known). */
      readonly attemptedMethod?: BodyScanLocalPreviewMethod;
    };

const NATIVE_REASON_CODES = new Set<SecurePdfPreviewSafeReasonCode>([
  "native_preview_unavailable",
  "invalid_file_uri",
  "outside_allowed_cache_root",
  "file_missing",
  "pdf_invalid",
  "pdf_locked",
  "pdf_empty",
  "presenter_unavailable",
  "preview_already_presented",
  "presentation_failed",
  "dismissal_failed",
  "unknown_native_preview_failure",
]);

function mapNativeSafeReason(code: SecurePdfPreviewSafeReasonCode): BodyScanLocalPreviewSafeReason {
  if (NATIVE_REASON_CODES.has(code)) {
    return code;
  }
  return "unknown_native_preview_failure";
}

/**
 * Open a local Body Scan original for view-only preview.
 *
 * On iOS, uses PDFKit via `OliSecurePdfPreview`. Promise settles after dismiss
 * (`deleteImmediately: true`) or returns a fixed safe failure. Never falls back
 * to WebBrowser, Linking, expo-sharing, or Quick Look for local files.
 *
 * Returns a typed result with fixed safe reason codes only (never URI/path/error text).
 */
export async function openBodyScanOriginalLocalPreview(
  localUri: string,
  options?: { readonly title?: string },
): Promise<BodyScanLocalPreviewResult> {
  if (typeof localUri !== "string" || localUri.length === 0) {
    return {
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: "local_pdf_invalid",
    };
  }

  if (Platform.OS === "ios") {
    if (!isOliSecurePdfPreviewAvailable()) {
      return {
        ok: false,
        opened: false,
        deleteImmediately: true,
        safeReasonCode: "native_preview_unavailable",
        attemptedMethod: "pdfkit",
      };
    }

    const native = await presentSecurePdfPreview({
      localUri,
      ...(typeof options?.title === "string" && options.title.length > 0
        ? { title: options.title }
        : {}),
    });

    if (native.ok) {
      return {
        ok: true,
        opened: true,
        method: "pdfkit",
        settlement: "dismissed",
        deleteImmediately: true,
      };
    }

    return {
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: mapNativeSafeReason(native.safeReasonCode),
      attemptedMethod: "pdfkit",
    };
  }

  // Stage 3E V1: no Android / other-platform secure viewer claim.
  return {
    ok: false,
    opened: false,
    deleteImmediately: true,
    safeReasonCode: "preview_method_unsupported",
  };
}

/** DEV-facing copy when the installed binary lacks the PDFKit module. */
export function nativePdfPreviewUnavailableDevMessage(): string {
  return "Rebuild the development client to enable the secure PDF viewer.";
}
