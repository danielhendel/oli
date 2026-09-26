/**
 * DEV-only Body Scan cache lifecycle harness.
 *
 * Exercises the same cache / finalize / preview / cleanup services as production
 * View Original, but sources a synthetic on-device PDF instead of a signed URL.
 * Backend-independent. No-op / fail-closed outside `__DEV__`.
 */

import * as FileSystem from "expo-file-system";

import {
  countToDevBucket,
  countToPartialBucket,
  emitBodyScanCacheDevStatus,
  isBodyScanCacheDevToolsEnabled,
  mapLegacyDeletedBucket,
  type BodyScanCacheDevSafeReason,
  type BodyScanCacheDevStatus,
} from "@/lib/data/body-scans/bodyScanCacheDevStatus";
import {
  BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS,
  clearAllBodyScanOriginalCaches,
  clearBodyScanOriginalCacheForAccount,
  clearBodyScanOriginalCacheForDocument,
  countBodyScanCacheInventory,
  createBodyScanOriginalPreviewPaths,
  deleteCachedBodyScanOriginal,
  materializeBodyScanOriginalFromBytes,
  opaqueAccountScopeKey,
  sweepStaleBodyScanOriginalCaches,
} from "@/lib/data/body-scans/bodyScanOriginalCache";
import { openBodyScanOriginalLocalPreview } from "@/lib/data/body-scans/openBodyScanOriginalLocalPreview";
import {
  SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID,
  buildInvalidSyntheticBodyScanCacheBytes,
  buildSyntheticBodyScanCachePdfBytes,
  uint8ToBase64,
} from "@/lib/data/body-scans/syntheticBodyScanCachePdf";
import { openDocumentOriginal } from "@/lib/data/documents/documentOriginalPreview";

async function inventoryBuckets(userId?: string, documentId?: string) {
  const counts = await countBodyScanCacheInventory({
    ...(userId != null ? { userId } : {}),
    ...(documentId != null ? { documentId } : {}),
  });
  return {
    remainingFiles: counts.remainingFiles,
    partialFiles: counts.partialFiles,
    remainingFileCountBucket: countToDevBucket(counts.remainingFiles),
    partialFileCountBucket: countToPartialBucket(counts.partialFiles),
  };
}

function notDevStatus(): BodyScanCacheDevStatus {
  return {
    operation: "preview_open",
    status: "failed",
    remainingFileCountBucket: "unknown",
    removedFileCountBucket: "unknown",
    partialFileCountBucket: "unknown",
    safeReasonCode: "not_dev",
    observedAtMs: Date.now(),
  };
}

function mapPreviewFailureReason(
  code: string | undefined,
): BodyScanCacheDevSafeReason {
  switch (code) {
    case "local_pdf_invalid":
      return "local_pdf_invalid";
    case "preview_method_unsupported":
      return "preview_method_unsupported";
    case "native_preview_unavailable":
      return "native_preview_unavailable";
    case "invalid_file_uri":
      return "invalid_file_uri";
    case "outside_allowed_cache_root":
      return "outside_allowed_cache_root";
    case "file_missing":
      return "file_missing";
    case "pdf_invalid":
      return "pdf_invalid";
    case "pdf_locked":
      return "pdf_locked";
    case "pdf_empty":
      return "pdf_empty";
    case "presenter_unavailable":
      return "presenter_unavailable";
    case "preview_already_presented":
      return "preview_already_presented";
    case "presentation_failed":
      return "presentation_failed";
    case "dismissal_failed":
      return "dismissal_failed";
    case "unknown_native_preview_failure":
      return "unknown_native_preview_failure";
    case "web_browser_open_failed":
      return "web_browser_open_failed";
    case "linking_open_failed":
      return "linking_open_failed";
    case "system_preview_open_failed":
      return "system_preview_open_failed";
    case "unknown_open_failure":
      return "unknown_open_failure";
    default:
      return "open_failed";
  }
}

export async function harnessOpenSyntheticReport(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  if (!args.userId) {
    return emitBodyScanCacheDevStatus({
      operation: "preview_open",
      status: "failed",
      remainingFileCountBucket: "unknown",
      removedFileCountBucket: "zero",
      partialFileCountBucket: "unknown",
      safeReasonCode: "no_auth",
    });
  }

  const bytes = buildSyntheticBodyScanCachePdfBytes();
  const bytesBase64 = uint8ToBase64(bytes);
  let localUri: string | null = null;
  let lastPreviewReason: string | undefined;
  let lastPreviewMethod: BodyScanCacheDevStatus["previewMethod"];
  let lastDeleteImmediately = true;

  const outcome = await openDocumentOriginal({
    requestGrant: async () => ({
      ok: true,
      available: true,
      // Never fetched — downloadToProtectedPath ignores the URL for the harness path.
      url: "https://invalid.example/synthetic-harness-never-fetched",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      mediaType: "application/pdf",
      filename: "synthetic.pdf",
    }),
    downloadToProtectedPath: async () => {
      const materialized = await materializeBodyScanOriginalFromBytes({
        userId: args.userId,
        documentId: SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID,
        bytesBase64,
      });
      if (!materialized.ok) return { ok: false };
      localUri = materialized.localUri;
      return { ok: true, localUri: materialized.localUri };
    },
    openLocal: async (uri) => {
      const result = await openBodyScanOriginalLocalPreview(uri);
      if (result.ok) {
        lastPreviewMethod = result.method;
        lastDeleteImmediately = result.deleteImmediately;
        return {
          opened: true,
          deleteImmediately: result.deleteImmediately,
        };
      }
      lastPreviewReason = result.safeReasonCode;
      lastPreviewMethod = result.attemptedMethod;
      lastDeleteImmediately = true;
      return { opened: false, deleteImmediately: true };
    },
    deleteLocal: async (uri) => {
      await deleteCachedBodyScanOriginal(uri);
    },
  });

  if (outcome.status === "error" && outcome.code === "DOWNLOAD_FAILED") {
    const inv = await inventoryBuckets(args.userId, SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID);
    return emitBodyScanCacheDevStatus({
      operation: "preview_failure_cleanup",
      status: "ok",
      remainingFileCountBucket: inv.remainingFileCountBucket,
      removedFileCountBucket: "unknown",
      partialFileCountBucket: inv.partialFileCountBucket,
      safeReasonCode: "download_or_materialize_failed",
    });
  }

  if (outcome.status === "error") {
    const inv = await inventoryBuckets(args.userId, SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID);
    return emitBodyScanCacheDevStatus({
      operation: "preview_failure_cleanup",
      status: inv.remainingFileCountBucket === "zero" ? "ok" : "failed",
      remainingFileCountBucket: inv.remainingFileCountBucket,
      removedFileCountBucket: "unknown",
      partialFileCountBucket: inv.partialFileCountBucket,
      safeReasonCode: mapPreviewFailureReason(lastPreviewReason),
      ...(lastPreviewMethod != null ? { previewMethod: lastPreviewMethod } : {}),
    });
  }

  const inv = await inventoryBuckets(args.userId, SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID);

  // Launch-only APIs must never claim close-cleanup success.
  if (!lastDeleteImmediately) {
    void localUri;
    return emitBodyScanCacheDevStatus({
      operation: "preview_open",
      status: "ok",
      remainingFileCountBucket: inv.remainingFileCountBucket,
      removedFileCountBucket: "zero",
      partialFileCountBucket: inv.partialFileCountBucket,
      safeReasonCode: "fallback_requires_stale_cleanup",
      ...(lastPreviewMethod != null ? { previewMethod: lastPreviewMethod } : {}),
    });
  }

  if (inv.remainingFileCountBucket === "zero" && inv.partialFileCountBucket === "zero") {
    return emitBodyScanCacheDevStatus({
      operation: "preview_close_cleanup",
      status: "ok",
      remainingFileCountBucket: "zero",
      removedFileCountBucket: "one",
      partialFileCountBucket: "zero",
      ...(lastPreviewMethod != null ? { previewMethod: lastPreviewMethod } : {}),
    });
  }

  void localUri;
  return emitBodyScanCacheDevStatus({
    operation: "preview_open",
    status: "ok",
    remainingFileCountBucket: inv.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: inv.partialFileCountBucket,
    safeReasonCode: "fallback_requires_stale_cleanup",
    ...(lastPreviewMethod != null ? { previewMethod: lastPreviewMethod } : {}),
  });
}

export async function harnessCreateInvalidSyntheticReport(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const bytesBase64 = uint8ToBase64(buildInvalidSyntheticBodyScanCacheBytes());
  const result = await materializeBodyScanOriginalFromBytes({
    userId: args.userId,
    documentId: SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID,
    bytesBase64,
  });
  if (result.ok) {
    await deleteCachedBodyScanOriginal(result.localUri);
  }
  const after = await inventoryBuckets(args.userId, SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID);
  return emitBodyScanCacheDevStatus({
    operation: "preview_failure_cleanup",
    status:
      after.remainingFileCountBucket === "zero" && after.partialFileCountBucket === "zero"
        ? "ok"
        : "failed",
    remainingFileCountBucket: after.remainingFileCountBucket,
    removedFileCountBucket: "unknown",
    partialFileCountBucket: after.partialFileCountBucket,
    safeReasonCode: "invalid_pdf_rejected",
  });
}

export async function harnessCreateStaleSyntheticPdf(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const before = await inventoryBuckets(args.userId);
  const bytesBase64 = uint8ToBase64(buildSyntheticBodyScanCachePdfBytes());
  const materialized = await materializeBodyScanOriginalFromBytes({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_stale`,
    bytesBase64,
    previewNonce: `pstale${Date.now().toString(36)}`,
  });
  const after = await inventoryBuckets(args.userId);
  const created =
    materialized.ok &&
    after.remainingFiles >= before.remainingFiles + 1 &&
    after.remainingFiles >= 1;

  // Verify the final PDF actually exists (not merely that write returned).
  let verified = false;
  if (materialized.ok) {
    try {
      const info = await FileSystem.getInfoAsync(materialized.localUri);
      verified = info.exists === true;
    } catch {
      verified = false;
    }
  }

  if (!created || !verified) {
    return emitBodyScanCacheDevStatus({
      operation: "fixture_create",
      status: "failed",
      remainingFileCountBucket: after.remainingFileCountBucket,
      removedFileCountBucket: "zero",
      partialFileCountBucket: after.partialFileCountBucket,
      safeReasonCode: "fixture_create_failed",
    });
  }

  return emitBodyScanCacheDevStatus({
    operation: "fixture_create",
    status: "ok",
    remainingFileCountBucket: after.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: after.partialFileCountBucket,
  });
}

export async function harnessCreateAbandonedPartial(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const before = await inventoryBuckets(args.userId);
  const paths = createBodyScanOriginalPreviewPaths({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_partial`,
    previewNonce: `ppart${Date.now().toString(36)}`,
  });
  try {
    await FileSystem.makeDirectoryAsync(paths.directoryUri, { intermediates: true });
    await FileSystem.writeAsStringAsync(paths.partialUri, "abandoned", {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    const afterFail = await inventoryBuckets(args.userId);
    return emitBodyScanCacheDevStatus({
      operation: "fixture_create",
      status: "failed",
      remainingFileCountBucket: afterFail.remainingFileCountBucket,
      removedFileCountBucket: "zero",
      partialFileCountBucket: afterFail.partialFileCountBucket,
      safeReasonCode: "fixture_create_failed",
    });
  }

  let verified = false;
  try {
    const info = await FileSystem.getInfoAsync(paths.partialUri);
    verified = info.exists === true;
  } catch {
    verified = false;
  }

  const after = await inventoryBuckets(args.userId);
  const created =
    verified &&
    after.partialFiles >= before.partialFiles + 1 &&
    after.remainingFiles >= before.remainingFiles + 1;

  if (!created) {
    return emitBodyScanCacheDevStatus({
      operation: "fixture_create",
      status: "failed",
      remainingFileCountBucket: after.remainingFileCountBucket,
      removedFileCountBucket: "zero",
      partialFileCountBucket: after.partialFileCountBucket,
      safeReasonCode: "fixture_create_failed",
    });
  }

  return emitBodyScanCacheDevStatus({
    operation: "fixture_create",
    status: "ok",
    remainingFileCountBucket: after.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: after.partialFileCountBucket,
  });
}

/** Safe DEV-only inventory probe — buckets only, never paths/IDs. */
export async function harnessInspectBodyScanTestCache(args?: {
  userId?: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const inv = await inventoryBuckets(args?.userId);
  return emitBodyScanCacheDevStatus({
    operation: "cache_inspect",
    status: "ok",
    remainingFileCountBucket: inv.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: inv.partialFileCountBucket,
  });
}

/**
 * Runs the real stale sweep. Advances the comparison clock via `nowMs` so freshly
 * created harness PDFs classify as stale (device FS may not support backdating mtime).
 * Abandoned `.partial` files are removed regardless of age (production policy).
 *
 * Fails the harness action when no files were present to remove, or when the sweep
 * reports a zero removed bucket despite a non-zero pre-sweep inventory.
 */
export async function harnessRunStaleSweep(): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const before = await countBodyScanCacheInventory();
  if (before.remainingFiles === 0) {
    return emitBodyScanCacheDevStatus({
      operation: "stale_sweep",
      status: "failed",
      remainingFileCountBucket: "zero",
      removedFileCountBucket: "zero",
      partialFileCountBucket: "zero",
      safeReasonCode: "fixture_missing_before_sweep",
    });
  }

  const result = await sweepStaleBodyScanOriginalCaches({
    nowMs: Date.now() + BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS + 60_000,
  });
  const after = await countBodyScanCacheInventory();
  const removedByInventory = Math.max(0, before.remainingFiles - after.remainingFiles);
  // Prefer actual inventory delta (counts files, not directories).
  const removedBucket = countToDevBucket(removedByInventory);
  const sweepOk = result.ok === true;
  const removedNonZero = removedByInventory > 0;
  const remainingClear = after.remainingFiles === 0 && after.partialFiles === 0;

  if (!sweepOk) {
    return emitBodyScanCacheDevStatus({
      operation: "stale_sweep",
      status: "failed",
      remainingFileCountBucket: countToDevBucket(after.remainingFiles),
      removedFileCountBucket: removedBucket,
      partialFileCountBucket: countToPartialBucket(after.partialFiles),
      safeReasonCode: "cleanup_failed",
    });
  }

  if (!removedNonZero) {
    return emitBodyScanCacheDevStatus({
      operation: "stale_sweep",
      status: "failed",
      remainingFileCountBucket: countToDevBucket(after.remainingFiles),
      removedFileCountBucket: "zero",
      partialFileCountBucket: countToPartialBucket(after.partialFiles),
      safeReasonCode: "removed_count_zero_unexpected",
    });
  }

  return emitBodyScanCacheDevStatus({
    operation: "stale_sweep",
    status: remainingClear ? "ok" : "failed",
    remainingFileCountBucket: countToDevBucket(after.remainingFiles),
    removedFileCountBucket: removedBucket,
    partialFileCountBucket: countToPartialBucket(after.partialFiles),
    // Keep sweep's own bucket available for cross-check in tests via mapLegacy when needed.
    ...(remainingClear ? {} : { safeReasonCode: "cleanup_failed" as const }),
  });
}

export async function harnessCreateCurrentAccountTestCache(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  void opaqueAccountScopeKey(args.userId);
  const before = await inventoryBuckets(args.userId);
  const bytesBase64 = uint8ToBase64(buildSyntheticBodyScanCachePdfBytes());
  const materialized = await materializeBodyScanOriginalFromBytes({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_acct`,
    bytesBase64,
  });
  const after = await inventoryBuckets(args.userId);
  const ok =
    materialized.ok && after.remainingFiles >= before.remainingFiles + 1 && after.remainingFiles >= 1;
  return emitBodyScanCacheDevStatus({
    operation: "fixture_create",
    status: ok ? "ok" : "failed",
    remainingFileCountBucket: after.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: after.partialFileCountBucket,
    ...(ok ? {} : { safeReasonCode: "fixture_create_failed" as const }),
  });
}

export async function harnessSimulatePostDeleteLocalCleanup(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const before = await countBodyScanCacheInventory({
    userId: args.userId,
    documentId: SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID,
  });
  const result = await clearBodyScanOriginalCacheForDocument({
    userId: args.userId,
    documentId: SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID,
  });
  await clearBodyScanOriginalCacheForDocument({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_stale`,
  });
  await clearBodyScanOriginalCacheForDocument({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_partial`,
  });
  await clearBodyScanOriginalCacheForDocument({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_acct`,
  });
  const after = await inventoryBuckets(args.userId);
  void before;
  return emitBodyScanCacheDevStatus({
    operation: "document_cleanup",
    status: result.ok && after.remainingFileCountBucket === "zero" ? "ok" : result.ok ? "ok" : "failed",
    remainingFileCountBucket: after.remainingFileCountBucket,
    removedFileCountBucket: result.ok ? mapLegacyDeletedBucket(result.deletedCountBucket) : "unknown",
    partialFileCountBucket: after.partialFileCountBucket,
  });
}

export async function harnessClearCurrentAccountCache(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const result = await clearBodyScanOriginalCacheForAccount(args.userId);
  const after = await inventoryBuckets(args.userId);
  return emitBodyScanCacheDevStatus({
    operation: "account_cleanup",
    status: result.ok ? "ok" : "failed",
    remainingFileCountBucket: after.remainingFileCountBucket,
    removedFileCountBucket: result.ok ? mapLegacyDeletedBucket(result.deletedCountBucket) : "unknown",
    partialFileCountBucket: after.partialFileCountBucket,
  });
}

export async function harnessClearAllBodyScanCaches(): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const result = await clearAllBodyScanOriginalCaches();
  const after = await countBodyScanCacheInventory();
  return emitBodyScanCacheDevStatus({
    operation: "account_cleanup",
    status: result.ok ? "ok" : "failed",
    remainingFileCountBucket: countToDevBucket(after.remainingFiles),
    removedFileCountBucket: result.ok ? mapLegacyDeletedBucket(result.deletedCountBucket) : "unknown",
    partialFileCountBucket: countToPartialBucket(after.partialFiles),
  });
}
