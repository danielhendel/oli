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
    openLocal: openBodyScanOriginalLocalPreview,
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
      safeReasonCode: "open_failed",
    });
  }

  // After openDocumentOriginal returns: if deleteImmediately ran, file should be gone.
  const inv = await inventoryBuckets(args.userId, SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID);
  if (inv.remainingFileCountBucket === "zero" && inv.partialFileCountBucket === "zero") {
    return emitBodyScanCacheDevStatus({
      operation: "preview_close_cleanup",
      status: "ok",
      remainingFileCountBucket: "zero",
      removedFileCountBucket: "one",
      partialFileCountBucket: "zero",
    });
  }

  // Linking fallback left the file — do not claim close cleanup.
  void localUri;
  return emitBodyScanCacheDevStatus({
    operation: "preview_open",
    status: "ok",
    remainingFileCountBucket: inv.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: inv.partialFileCountBucket,
    safeReasonCode: "fallback_requires_stale_cleanup",
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
    status: after.remainingFileCountBucket === "zero" && after.partialFileCountBucket === "zero" ? "ok" : "failed",
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
  const bytesBase64 = uint8ToBase64(buildSyntheticBodyScanCachePdfBytes());
  await materializeBodyScanOriginalFromBytes({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_stale`,
    bytesBase64,
    previewNonce: `pstale${Date.now().toString(36)}`,
  });
  const inv = await inventoryBuckets(args.userId);
  return emitBodyScanCacheDevStatus({
    operation: "preview_open",
    status: "ok",
    remainingFileCountBucket: inv.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: inv.partialFileCountBucket,
  });
}

export async function harnessCreateAbandonedPartial(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const paths = createBodyScanOriginalPreviewPaths({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_partial`,
    previewNonce: `ppart${Date.now().toString(36)}`,
  });
  await FileSystem.makeDirectoryAsync(paths.directoryUri, { intermediates: true });
  await FileSystem.writeAsStringAsync(paths.partialUri, "abandoned", {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const inv = await inventoryBuckets(args.userId);
  return emitBodyScanCacheDevStatus({
    operation: "preview_open",
    status: "ok",
    remainingFileCountBucket: inv.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: inv.partialFileCountBucket,
  });
}

/**
 * Runs the real stale sweep. Uses a future "now" so freshly created harness files
 * appear past BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS (device FS may not support backdating).
 */
export async function harnessRunStaleSweep(): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  const before = await countBodyScanCacheInventory();
  const result = await sweepStaleBodyScanOriginalCaches({
    now: () => Date.now() + BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS + 60_000,
  });
  const after = await countBodyScanCacheInventory();
  const removed = Math.max(0, before.remainingFiles - after.remainingFiles);
  return emitBodyScanCacheDevStatus({
    operation: "stale_sweep",
    status: result.ok ? "ok" : "failed",
    remainingFileCountBucket: countToDevBucket(after.remainingFiles),
    removedFileCountBucket: result.ok
      ? mapLegacyDeletedBucket(result.deletedCountBucket)
      : countToDevBucket(removed),
    partialFileCountBucket: countToPartialBucket(after.partialFiles),
    ...(result.ok ? {} : { safeReasonCode: "cleanup_failed" as const }),
  });
}

export async function harnessCreateCurrentAccountTestCache(args: {
  userId: string;
}): Promise<BodyScanCacheDevStatus | null> {
  if (!isBodyScanCacheDevToolsEnabled()) return notDevStatus();
  // Ensure opaque scope differs per account without exposing it.
  void opaqueAccountScopeKey(args.userId);
  const bytesBase64 = uint8ToBase64(buildSyntheticBodyScanCachePdfBytes());
  await materializeBodyScanOriginalFromBytes({
    userId: args.userId,
    documentId: `${SYNTHETIC_BODY_SCAN_CACHE_DOCUMENT_ID}_acct`,
    bytesBase64,
  });
  const inv = await inventoryBuckets(args.userId);
  return emitBodyScanCacheDevStatus({
    operation: "preview_open",
    status: "ok",
    remainingFileCountBucket: inv.remainingFileCountBucket,
    removedFileCountBucket: "zero",
    partialFileCountBucket: inv.partialFileCountBucket,
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
  // Also clear known harness sibling document ids used by other actions.
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
