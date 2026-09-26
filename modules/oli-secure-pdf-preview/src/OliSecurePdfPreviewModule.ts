import { requireOptionalNativeModule } from "expo";

import type {
  SecurePdfPreviewRequest,
  SecurePdfPreviewResult,
  SecurePdfPreviewSafeReasonCode,
} from "./OliSecurePdfPreview.types";

type NativeSecurePdfPreviewModule = {
  presentAsync(request: SecurePdfPreviewRequest): Promise<SecurePdfPreviewResult>;
};

const NativeModule =
  requireOptionalNativeModule<NativeSecurePdfPreviewModule>("OliSecurePdfPreview");

const ALLOWED_FAILURE_CODES = new Set<SecurePdfPreviewSafeReasonCode>([
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

function mapSafeFailure(code: unknown): SecurePdfPreviewResult {
  const asString = typeof code === "string" ? code : "unknown_native_preview_failure";
  const safeReasonCode = ALLOWED_FAILURE_CODES.has(asString as SecurePdfPreviewSafeReasonCode)
    ? (asString as SecurePdfPreviewSafeReasonCode)
    : "unknown_native_preview_failure";
  return { ok: false, safeReasonCode };
}

function mapNativeResult(raw: unknown): SecurePdfPreviewResult {
  if (raw == null || typeof raw !== "object") {
    return mapSafeFailure("unknown_native_preview_failure");
  }
  const record = raw as Record<string, unknown>;
  if (record.ok === true) {
    if (
      record.method === "pdfkit" &&
      record.settlement === "dismissed" &&
      record.deleteImmediately === true
    ) {
      return {
        ok: true,
        method: "pdfkit",
        settlement: "dismissed",
        deleteImmediately: true,
      };
    }
    return mapSafeFailure("unknown_native_preview_failure");
  }
  if (record.ok === false) {
    return mapSafeFailure(record.safeReasonCode);
  }
  return mapSafeFailure("unknown_native_preview_failure");
}

/** True when the native PDFKit module is linked into this binary. */
export function isOliSecurePdfPreviewAvailable(): boolean {
  return NativeModule != null && typeof NativeModule.presentAsync === "function";
}

/**
 * Present a validated local PDF in the Oli-owned PDFKit viewer.
 * Resolves only after dismissal or a fixed safe failure. Never throws raw native errors.
 */
export async function presentSecurePdfPreview(
  request: SecurePdfPreviewRequest,
): Promise<SecurePdfPreviewResult> {
  if (typeof request.localUri !== "string" || request.localUri.length === 0) {
    return { ok: false, safeReasonCode: "invalid_file_uri" };
  }
  if (!isOliSecurePdfPreviewAvailable() || NativeModule == null) {
    return { ok: false, safeReasonCode: "native_preview_unavailable" };
  }

  try {
    const payload: SecurePdfPreviewRequest = {
      localUri: request.localUri,
      ...(typeof request.title === "string" && request.title.length > 0
        ? { title: request.title }
        : {}),
    };
    const raw = await NativeModule.presentAsync(payload);
    return mapNativeResult(raw);
  } catch {
    // Never surface native exception text — fixed safe code only.
    return { ok: false, safeReasonCode: "unknown_native_preview_failure" };
  }
}

export type { SecurePdfPreviewRequest, SecurePdfPreviewResult, SecurePdfPreviewSafeReasonCode };
