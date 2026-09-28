/**
 * View Original preview hook (client) — B-3E-CACHE-01 hardened.
 *
 * Wires the pure controller to the account-scoped Body Scan original cache and
 * the OliSecurePdfPreview PDFKit viewer (iOS). Cache lifecycle remains JS-owned.
 *
 * Preview API semantics (Stage 3E V1):
 * - iOS PDFKit dismiss settlement → immediate delete in `finally`.
 * - Never WebBrowser / Linking / expo-sharing / Quick Look for local Body Scan PDFs.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { viewDocumentOriginal } from "@/lib/api/documents";
import {
  countToDevBucket,
  countToPartialBucket,
  emitBodyScanCacheDevStatus,
  type BodyScanCacheDevSafeReason,
} from "@/lib/data/body-scans/bodyScanCacheDevStatus";
import {
  countBodyScanCacheInventory,
  deleteCachedBodyScanOriginal,
  downloadBodyScanOriginalToProtectedCache,
  sweepStaleBodyScanOriginalCaches,
  type BodyScanOriginalDownloadFailureReason,
} from "@/lib/data/body-scans/bodyScanOriginalCache";
import {
  byteLengthToDevBucket,
  emitBodyScanRuntimeDevStatus,
  httpStatusToDevBucket,
  type BodyScanRuntimeDevSafeReason,
} from "@/lib/data/body-scans/bodyScanRuntimeDevStatus";
import {
  nativePdfPreviewUnavailableDevMessage,
  openBodyScanOriginalLocalPreview,
  type BodyScanLocalPreviewMethod,
  type BodyScanLocalPreviewSafeReason,
} from "@/lib/data/body-scans/openBodyScanOriginalLocalPreview";
import {
  documentOriginalPreviewMessage,
  openDocumentOriginal,
  type DocumentOriginalPreviewOutcome,
} from "@/lib/data/documents/documentOriginalPreview";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

export type DocumentOriginalPreviewState = {
  busy: boolean;
  message: string | null;
};

function mapPreviewOpenSafeReason(
  code: BodyScanLocalPreviewSafeReason | undefined,
): BodyScanCacheDevSafeReason {
  switch (code) {
    case "local_pdf_invalid":
    case "preview_method_unsupported":
    case "native_preview_unavailable":
    case "invalid_file_uri":
    case "outside_allowed_cache_root":
    case "file_missing":
    case "pdf_invalid":
    case "pdf_locked":
    case "pdf_empty":
    case "presenter_unavailable":
    case "preview_already_presented":
    case "presentation_failed":
    case "dismissal_failed":
    case "unknown_native_preview_failure":
    case "web_browser_open_failed":
    case "linking_open_failed":
    case "system_preview_open_failed":
    case "unknown_open_failure":
      return code;
    default:
      return "open_failed";
  }
}

export function useDocumentOriginalPreview(documentId: string | null) {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<DocumentOriginalPreviewState>({ busy: false, message: null });
  const lastLocalUriRef = useRef<string | null>(null);
  const lastDeleteImmediatelyRef = useRef(true);
  const lastOpenSafeReasonRef = useRef<BodyScanLocalPreviewSafeReason | undefined>(undefined);
  const lastDownloadSafeReasonRef = useRef<BodyScanOriginalDownloadFailureReason | undefined>(
    undefined,
  );
  const lastPreviewMethodRef = useRef<BodyScanLocalPreviewMethod | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void sweepStaleBodyScanOriginalCaches();
    return () => {
      mountedRef.current = false;
      lastLocalUriRef.current = null;
    };
  }, [documentId]);

  const open = useCallback(async (): Promise<DocumentOriginalPreviewOutcome | null> => {
    if (!documentId || !user?.uid) {
      emitBodyScanRuntimeDevStatus({
        operation: "original_report",
        stage: "early_return",
        status: "failed",
        safeReasonCode: !user?.uid ? "missing_auth" : "unknown",
      });
      return null;
    }
    setState({ busy: true, message: null });
    emitBodyScanRuntimeDevStatus({
      operation: "original_report",
      stage: "press",
      status: "started",
    });

    await sweepStaleBodyScanOriginalCaches();

    const userId = user.uid;
    lastDeleteImmediatelyRef.current = true;
    lastOpenSafeReasonRef.current = undefined;
    lastDownloadSafeReasonRef.current = undefined;
    lastPreviewMethodRef.current = undefined;
    const outcome = await openDocumentOriginal({
      requestGrant: async () => {
        emitBodyScanRuntimeDevStatus({
          operation: "original_report",
          stage: "grant_start",
          status: "started",
        });
        const token = await getIdToken(false);
        if (!token) {
          emitBodyScanRuntimeDevStatus({
            operation: "original_report",
            stage: "grant_failed",
            status: "failed",
            safeReasonCode: "missing_auth",
          });
          return null;
        }
        const res = await viewDocumentOriginal(token, documentId, {
          cacheBust: `view-original-${Date.now()}`,
        });
        const parsed = truthOutcomeFromApiResult(res);
        if (parsed.status !== "ready") {
          emitBodyScanRuntimeDevStatus({
            operation: "original_report",
            stage: "grant_failed",
            status: "failed",
            httpBucket: httpStatusToDevBucket(res.status),
            safeReasonCode: "http_failed",
          });
          return null;
        }
        emitBodyScanRuntimeDevStatus({
          operation: "original_report",
          stage: "grant_success",
          status: "ok",
          httpBucket: httpStatusToDevBucket(res.status),
        });
        return parsed.data;
      },
      downloadToProtectedPath: async ({ url }) => {
        const downloaded = await downloadBodyScanOriginalToProtectedCache({
          userId,
          documentId,
          url,
          onDownloadStage: (event) => {
            if (event.stage === "policy_pass" || event.stage === "policy_fail") {
              emitBodyScanRuntimeDevStatus({
                operation: "original_report",
                stage: event.stage === "policy_pass" ? "policy_pass" : "policy_fail",
                status: event.ok ? "ok" : "failed",
                ...(event.reason
                  ? { safeReasonCode: event.reason as BodyScanRuntimeDevSafeReason }
                  : {}),
              });
              return;
            }
            if (event.stage === "fetch_start") {
              emitBodyScanRuntimeDevStatus({
                operation: "original_report",
                stage: "fetch_start",
                status: "started",
              });
              return;
            }
            if (event.stage === "fetch_response") {
              emitBodyScanRuntimeDevStatus({
                operation: "original_report",
                stage: "fetch_response",
                status: event.ok ? "ok" : "failed",
                httpBucket: httpStatusToDevBucket(event.httpStatus),
              });
              return;
            }
            if (event.stage === "bytes_validated") {
              emitBodyScanRuntimeDevStatus({
                operation: "original_report",
                stage: "bytes_validated",
                status: event.ok ? "ok" : "failed",
                byteBucket:
                  typeof event.byteLength === "number"
                    ? byteLengthToDevBucket(event.byteLength)
                    : "unknown",
                ...(event.reason
                  ? { safeReasonCode: event.reason as BodyScanRuntimeDevSafeReason }
                  : {}),
              });
            }
          },
          onMaterializeStage: (event) => {
            emitBodyScanRuntimeDevStatus({
              operation: "original_report",
              stage: event.stage,
              status: event.ok ? "ok" : "failed",
              ...(event.ok
                ? {}
                : {
                    safeReasonCode:
                      event.stage === "pdf_validation" ||
                      event.stage === "in_memory_pdf_magic" ||
                      event.stage === "after_write_pdf_magic"
                        ? "invalid_pdf_rejected"
                        : "materialize_write_failed",
                  }),
            });
          },
        });
        if (!downloaded.ok) {
          lastDownloadSafeReasonRef.current = downloaded.safeReasonCode;
          return { ok: false };
        }
        lastLocalUriRef.current = downloaded.localUri;
        lastDownloadSafeReasonRef.current = undefined;
        return { ok: true, localUri: downloaded.localUri };
      },
      openLocal: async (localUri) => {
        emitBodyScanRuntimeDevStatus({
          operation: "original_report",
          stage: "native_open",
          status: "started",
        });
        const result = await openBodyScanOriginalLocalPreview(localUri, {
          title: "Original Report",
        });
        lastDeleteImmediatelyRef.current = result.deleteImmediately;
        lastOpenSafeReasonRef.current = result.ok ? undefined : result.safeReasonCode;
        lastPreviewMethodRef.current = result.ok ? result.method : result.attemptedMethod;
        emitBodyScanRuntimeDevStatus({
          operation: "original_report",
          stage: "native_open",
          status: result.opened ? "ok" : "failed",
          ...(result.opened ? {} : { safeReasonCode: "open_failed" }),
        });
        return {
          opened: result.opened,
          deleteImmediately: result.deleteImmediately,
        };
      },
      deleteLocal: async (localUri) => {
        await deleteCachedBodyScanOriginal(localUri);
        if (lastLocalUriRef.current === localUri) {
          lastLocalUriRef.current = null;
        }
      },
    });

    // DEV-only observability for physical cache gate (no paths/IDs).
    if (outcome.status === "error" && outcome.code === "DOWNLOAD_FAILED") {
      const inv = await countBodyScanCacheInventory({ userId, documentId });
      const downloadReason = lastDownloadSafeReasonRef.current;
      const safeReasonCode: BodyScanCacheDevSafeReason =
        downloadReason === "download_http_failed" ||
        downloadReason === "download_empty" ||
        downloadReason === "download_timeout" ||
        downloadReason === "download_content_too_large" ||
        downloadReason === "download_url_rejected" ||
        downloadReason === "invalid_pdf_rejected" ||
        downloadReason === "materialize_write_failed"
          ? downloadReason
          : "download_or_materialize_failed";
      emitBodyScanCacheDevStatus({
        operation: "preview_failure_cleanup",
        status: inv.remainingFiles === 0 ? "ok" : "failed",
        remainingFileCountBucket: countToDevBucket(inv.remainingFiles),
        removedFileCountBucket: "unknown",
        partialFileCountBucket: countToPartialBucket(inv.partialFiles),
        safeReasonCode,
      });
      emitBodyScanRuntimeDevStatus({
        operation: "original_report",
        stage: "cleanup_complete",
        status: inv.remainingFiles === 0 && inv.partialFiles === 0 ? "ok" : "failed",
        safeReasonCode: safeReasonCode as BodyScanRuntimeDevSafeReason,
      });
    } else if (outcome.status === "error") {
      const inv = await countBodyScanCacheInventory({ userId, documentId });
      emitBodyScanCacheDevStatus({
        operation: "preview_failure_cleanup",
        status: inv.remainingFiles === 0 ? "ok" : "failed",
        remainingFileCountBucket: countToDevBucket(inv.remainingFiles),
        removedFileCountBucket: "unknown",
        partialFileCountBucket: countToPartialBucket(inv.partialFiles),
        safeReasonCode: mapPreviewOpenSafeReason(lastOpenSafeReasonRef.current),
        ...(lastPreviewMethodRef.current != null
          ? { previewMethod: lastPreviewMethodRef.current }
          : {}),
      });
    } else if (outcome.status === "opened") {
      const inv = await countBodyScanCacheInventory({ userId, documentId });
      if (lastDeleteImmediatelyRef.current) {
        emitBodyScanCacheDevStatus({
          operation: "preview_close_cleanup",
          status: inv.remainingFiles === 0 && inv.partialFiles === 0 ? "ok" : "failed",
          remainingFileCountBucket: countToDevBucket(inv.remainingFiles),
          removedFileCountBucket: inv.remainingFiles === 0 ? "one" : "unknown",
          partialFileCountBucket: countToPartialBucket(inv.partialFiles),
          ...(lastPreviewMethodRef.current != null
            ? { previewMethod: lastPreviewMethodRef.current }
            : {}),
        });
        emitBodyScanRuntimeDevStatus({
          operation: "original_report",
          stage: "native_close",
          status: "ok",
        });
        emitBodyScanRuntimeDevStatus({
          operation: "original_report",
          stage: "cleanup_complete",
          status: inv.remainingFiles === 0 && inv.partialFiles === 0 ? "ok" : "failed",
        });
      } else {
        emitBodyScanCacheDevStatus({
          operation: "preview_open",
          status: "ok",
          remainingFileCountBucket: countToDevBucket(inv.remainingFiles),
          removedFileCountBucket: "zero",
          partialFileCountBucket: countToPartialBucket(inv.partialFiles),
          safeReasonCode: "fallback_requires_stale_cleanup",
          ...(lastPreviewMethodRef.current != null
            ? { previewMethod: lastPreviewMethodRef.current }
            : {}),
        });
      }
    }

    if (mountedRef.current) {
      let message = documentOriginalPreviewMessage(outcome);
      if (
        __DEV__ &&
        outcome.status === "error" &&
        lastOpenSafeReasonRef.current === "native_preview_unavailable"
      ) {
        message = nativePdfPreviewUnavailableDevMessage();
      }
      setState({ busy: false, message });
    }
    return outcome;
  }, [documentId, getIdToken, user?.uid]);

  const clearMessage = useCallback(() => {
    setState((prev) => ({ ...prev, message: null }));
  }, []);

  const clearPreviewState = useCallback(() => {
    lastLocalUriRef.current = null;
    setState({ busy: false, message: null });
  }, []);

  return { ...state, open, clearMessage, clearPreviewState };
}
