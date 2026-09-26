/**
 * Body Scan original-report local cache (B-3E-CACHE-01).
 *
 * App-private, account-isolated temporary storage for short-lived PDF previews.
 * Never a permanent offline source copy. Paths hold no patient name, report name,
 * DOB, or raw UID. Deletion is idempotent and wired through account/scan lifecycle.
 *
 * Stale TTL (local, not the 120s signed-URL grant):
 * - Final preview files older than BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS are removed.
 * - Abandoned `.partial` files are removed aggressively on every sweep.
 *
 * Platform preview semantics (Stage 3E V1):
 * - iOS `OliSecurePdfPreview` (PDFKit) resolves when the viewer is dismissed →
 *   immediate per-open cleanup in `finally` (`deleteImmediately: true`).
 * - This module owns cache paths / cleanup only — it does not present PDFs.
 */

import * as FileSystem from "expo-file-system";

/** Maximum age for a completed local preview PDF before stale sweep removes it. */
export const BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/** Root directory name under the app cache directory. */
export const BODY_SCAN_ORIGINAL_CACHE_ROOT_NAME = "body-scans";

export type BodyScanOriginalCacheCleanupStatus =
  | { ok: true; deletedCountBucket: "0" | "1" | "2_5" | "6_plus" }
  | { ok: false; reasonCode: "NO_CACHE_DIR" | "SWEEP_FAILED" };

export type BodyScanOriginalPreviewPaths = {
  readonly accountScopeKey: string;
  readonly documentKey: string;
  readonly previewNonce: string;
  readonly directoryUri: string;
  readonly partialUri: string;
  readonly finalUri: string;
};

function cacheBaseDirectory(): string | null {
  return FileSystem.cacheDirectory ?? null;
}

/**
 * Deterministic opaque account key. Isolates caches without placing a raw UID in
 * paths that might appear in support dumps. Not a cryptographic commitment.
 */
export function opaqueAccountScopeKey(userId: string): string {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("account_scope_required");
  }
  let a = 2166136261 >>> 0;
  let b = 5381 >>> 0;
  for (let i = 0; i < userId.length; i += 1) {
    const c = userId.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619) >>> 0;
    b = (Math.imul(b, 33) ^ c) >>> 0;
  }
  return `a${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

/** Sanitize a path segment: alphanumeric / underscore / hyphen only; reject traversal. */
export function sanitizeBodyScanCacheSegment(raw: string, fallbackLabel: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new Error(`${fallbackLabel}_invalid`);
  }
  return cleaned.slice(0, 128);
}

export function getBodyScanOriginalCacheRootUri(): string | null {
  const base = cacheBaseDirectory();
  if (!base) return null;
  return `${base}${BODY_SCAN_ORIGINAL_CACHE_ROOT_NAME}/`;
}

export function getBodyScanOriginalCacheAccountRootUri(accountScopeKey: string): string | null {
  const root = getBodyScanOriginalCacheRootUri();
  if (!root) return null;
  const scope = sanitizeBodyScanCacheSegment(accountScopeKey, "account_scope");
  return `${root}${scope}/`;
}

export function getBodyScanDocumentCacheDirectoryUri(
  accountScopeKey: string,
  documentId: string,
): string | null {
  const accountRoot = getBodyScanOriginalCacheAccountRootUri(accountScopeKey);
  if (!accountRoot) return null;
  const documentKey = sanitizeBodyScanCacheSegment(documentId, "document_id");
  return `${accountRoot}${documentKey}/`;
}

export function createBodyScanOriginalPreviewPaths(args: {
  userId: string;
  documentId: string;
  previewNonce?: string;
  now?: () => number;
}): BodyScanOriginalPreviewPaths {
  const accountScopeKey = opaqueAccountScopeKey(args.userId);
  const documentKey = sanitizeBodyScanCacheSegment(args.documentId, "document_id");
  const now = (args.now ?? Date.now)();
  const previewNonce =
    args.previewNonce ??
    `p${now.toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const safeNonce = sanitizeBodyScanCacheSegment(previewNonce, "preview_nonce");
  const directoryUri = getBodyScanDocumentCacheDirectoryUri(accountScopeKey, documentKey);
  if (!directoryUri) {
    throw new Error("cache_directory_unavailable");
  }
  assertUriInsideBodyScanRoot(directoryUri);
  const partialUri = `${directoryUri}${safeNonce}.partial`;
  const finalUri = `${directoryUri}${safeNonce}.pdf`;
  assertUriInsideBodyScanRoot(partialUri);
  assertUriInsideBodyScanRoot(finalUri);
  return {
    accountScopeKey,
    documentKey,
    previewNonce: safeNonce,
    directoryUri,
    partialUri,
    finalUri,
  };
}

export function assertUriInsideBodyScanRoot(uri: string): void {
  const root = getBodyScanOriginalCacheRootUri();
  if (!root) throw new Error("cache_directory_unavailable");
  if (!uri.startsWith(root)) {
    throw new Error("cache_path_escape");
  }
  if (uri.includes("..")) {
    throw new Error("cache_path_traversal");
  }
}

function deletedCountBucket(count: number): "0" | "1" | "2_5" | "6_plus" {
  if (count <= 0) return "0";
  if (count === 1) return "1";
  if (count <= 5) return "2_5";
  return "6_plus";
}

async function deleteUriIdempotent(uri: string): Promise<boolean> {
  try {
    assertUriInsideBodyScanRoot(uri);
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(uri: string): Promise<boolean> {
  try {
    assertUriInsideBodyScanRoot(uri);
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a short-lived signed URL into a per-open private path.
 * Writes `.partial` first, verifies a PDF header, then renames to `.pdf`.
 * On any failure, both candidates are deleted.
 */
export async function downloadBodyScanOriginalToProtectedCache(args: {
  userId: string;
  documentId: string;
  url: string;
  previewNonce?: string;
}): Promise<{ ok: true; localUri: string; paths: BodyScanOriginalPreviewPaths } | { ok: false }> {
  const prepared = await prepareBodyScanOriginalPreviewPaths(args);
  if (!prepared.ok) return { ok: false };
  const { paths } = prepared;

  try {
    const result = await FileSystem.downloadAsync(args.url, paths.partialUri);
    if (result.status < 200 || result.status >= 300) {
      await deleteUriIdempotent(paths.partialUri);
      await deleteUriIdempotent(paths.finalUri);
      return { ok: false };
    }
    return await finalizeBodyScanOriginalFromPartial(paths);
  } catch {
    await deleteUriIdempotent(paths.partialUri);
    await deleteUriIdempotent(paths.finalUri);
    return { ok: false };
  }
}

/**
 * Materialize bytes into the same `.partial` → verify → `.pdf` pipeline used by download.
 * Used by the DEV synthetic harness so lifecycle after partial creation is identical.
 */
export async function materializeBodyScanOriginalFromBytes(args: {
  userId: string;
  documentId: string;
  bytesBase64: string;
  previewNonce?: string;
}): Promise<{ ok: true; localUri: string; paths: BodyScanOriginalPreviewPaths } | { ok: false }> {
  const prepared = await prepareBodyScanOriginalPreviewPaths(args);
  if (!prepared.ok) return { ok: false };
  const { paths } = prepared;

  try {
    await FileSystem.writeAsStringAsync(paths.partialUri, args.bytesBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return await finalizeBodyScanOriginalFromPartial(paths);
  } catch {
    await deleteUriIdempotent(paths.partialUri);
    await deleteUriIdempotent(paths.finalUri);
    return { ok: false };
  }
}

async function prepareBodyScanOriginalPreviewPaths(args: {
  userId: string;
  documentId: string;
  previewNonce?: string;
}): Promise<{ ok: true; paths: BodyScanOriginalPreviewPaths } | { ok: false }> {
  let paths: BodyScanOriginalPreviewPaths;
  try {
    paths = createBodyScanOriginalPreviewPaths({
      userId: args.userId,
      documentId: args.documentId,
      ...(args.previewNonce != null ? { previewNonce: args.previewNonce } : {}),
    });
  } catch {
    return { ok: false };
  }
  const prepared = await ensureDirectory(paths.directoryUri);
  if (!prepared) return { ok: false };
  try {
    await FileSystem.deleteAsync(paths.partialUri, { idempotent: true }).catch(() => undefined);
    await FileSystem.deleteAsync(paths.finalUri, { idempotent: true }).catch(() => undefined);
  } catch {
    // continue
  }
  return { ok: true, paths };
}

/**
 * Shared post-partial pipeline: verify PDF magic, move to `.pdf`, or wipe both candidates.
 */
export async function finalizeBodyScanOriginalFromPartial(
  paths: BodyScanOriginalPreviewPaths,
): Promise<{ ok: true; localUri: string; paths: BodyScanOriginalPreviewPaths } | { ok: false }> {
  try {
    const valid = await verifyLocalPdfCandidate(paths.partialUri);
    if (!valid) {
      await deleteUriIdempotent(paths.partialUri);
      await deleteUriIdempotent(paths.finalUri);
      return { ok: false };
    }
    await FileSystem.moveAsync({ from: paths.partialUri, to: paths.finalUri });
    return { ok: true, localUri: paths.finalUri, paths };
  } catch {
    await deleteUriIdempotent(paths.partialUri);
    await deleteUriIdempotent(paths.finalUri);
    return { ok: false };
  }
}

/** Confirm the downloaded bytes look like a PDF before handing them to the OS. */
export async function verifyLocalPdfCandidate(localUri: string): Promise<boolean> {
  try {
    assertUriInsideBodyScanRoot(localUri);
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) return false;
    if ("size" in info && typeof info.size === "number" && info.size < 5) return false;
    const head = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.UTF8,
      length: 5,
      position: 0,
    });
    return head.startsWith("%PDF");
  } catch {
    return false;
  }
}

export async function deleteCachedBodyScanOriginal(localUri: string): Promise<void> {
  await deleteUriIdempotent(localUri);
  // Best-effort: remove empty document directory when possible.
  const parent = localUri.replace(/[^/]+$/, "");
  if (parent && parent !== localUri) {
    try {
      assertUriInsideBodyScanRoot(parent);
      const listing = await FileSystem.readDirectoryAsync(parent);
      if (listing.length === 0) {
        await FileSystem.deleteAsync(parent, { idempotent: true });
      }
    } catch {
      // Ignore — directory may still be in use or already gone.
    }
  }
}

export async function clearBodyScanOriginalCacheForDocument(args: {
  userId: string;
  documentId: string;
}): Promise<BodyScanOriginalCacheCleanupStatus> {
  const directoryUri = getBodyScanDocumentCacheDirectoryUri(
    opaqueAccountScopeKey(args.userId),
    args.documentId,
  );
  if (!directoryUri) return { ok: false, reasonCode: "NO_CACHE_DIR" };
  try {
    assertUriInsideBodyScanRoot(directoryUri);
    const info = await FileSystem.getInfoAsync(directoryUri);
    if (!info.exists) return { ok: true, deletedCountBucket: "0" };
    await FileSystem.deleteAsync(directoryUri, { idempotent: true });
    return { ok: true, deletedCountBucket: "1" };
  } catch {
    return { ok: false, reasonCode: "SWEEP_FAILED" };
  }
}

export async function clearBodyScanOriginalCacheForAccount(
  userId: string,
): Promise<BodyScanOriginalCacheCleanupStatus> {
  const accountRoot = getBodyScanOriginalCacheAccountRootUri(opaqueAccountScopeKey(userId));
  if (!accountRoot) return { ok: false, reasonCode: "NO_CACHE_DIR" };
  try {
    assertUriInsideBodyScanRoot(accountRoot);
    const info = await FileSystem.getInfoAsync(accountRoot);
    if (!info.exists) return { ok: true, deletedCountBucket: "0" };
    await FileSystem.deleteAsync(accountRoot, { idempotent: true });
    return { ok: true, deletedCountBucket: "1" };
  } catch {
    return { ok: false, reasonCode: "SWEEP_FAILED" };
  }
}

/**
 * Remove every Body Scan original cache under the dedicated root.
 * Used on account deletion / global health store clear paths.
 */
export async function clearAllBodyScanOriginalCaches(): Promise<BodyScanOriginalCacheCleanupStatus> {
  const root = getBodyScanOriginalCacheRootUri();
  if (!root) return { ok: false, reasonCode: "NO_CACHE_DIR" };
  try {
    const info = await FileSystem.getInfoAsync(root);
    if (!info.exists) return { ok: true, deletedCountBucket: "0" };
    await FileSystem.deleteAsync(root, { idempotent: true });
    return { ok: true, deletedCountBucket: "1" };
  } catch {
    return { ok: false, reasonCode: "SWEEP_FAILED" };
  }
}

type SweepDeps = {
  /** Preferred injectable clock (epoch ms). Production default: Date.now(). */
  nowMs?: number;
  /** @deprecated Prefer nowMs — retained for existing call sites/tests. */
  now?: () => number;
  maxAgeMs?: number;
};

/**
 * Bounded stale sweep over the dedicated Body Scan cache root only.
 * Never touches unrelated app cache.
 *
 * Optional `nowMs` advances the comparison clock without changing the device clock
 * (required for DEV harness stale fixtures when FS mtime cannot be backdated).
 */
export async function sweepStaleBodyScanOriginalCaches(
  deps: SweepDeps = {},
): Promise<BodyScanOriginalCacheCleanupStatus> {
  const root = getBodyScanOriginalCacheRootUri();
  if (!root) return { ok: false, reasonCode: "NO_CACHE_DIR" };
  const now =
    typeof deps.nowMs === "number" && Number.isFinite(deps.nowMs)
      ? deps.nowMs
      : (deps.now ?? Date.now)();
  const maxAgeMs = deps.maxAgeMs ?? BODY_SCAN_ORIGINAL_CACHE_MAX_AGE_MS;
  let deleted = 0;

  try {
    const rootInfo = await FileSystem.getInfoAsync(root);
    if (!rootInfo.exists) return { ok: true, deletedCountBucket: "0" };

    const accounts = await FileSystem.readDirectoryAsync(root);
    for (const accountEntry of accounts) {
      if (accountEntry.includes("..") || accountEntry.includes("/")) continue;
      const accountUri = `${root}${accountEntry}/`;
      let documents: string[];
      try {
        documents = await FileSystem.readDirectoryAsync(accountUri);
      } catch {
        continue;
      }
      for (const documentEntry of documents) {
        if (documentEntry.includes("..") || documentEntry.includes("/")) continue;
        const documentUri = `${accountUri}${documentEntry}/`;
        let files: string[];
        try {
          files = await FileSystem.readDirectoryAsync(documentUri);
        } catch {
          continue;
        }
        for (const fileName of files) {
          if (fileName.includes("..") || fileName.includes("/")) continue;
          const fileUri = `${documentUri}${fileName}`;
          try {
            assertUriInsideBodyScanRoot(fileUri);
            const isPartial = fileName.endsWith(".partial");
            const isPdf = fileName.endsWith(".pdf");
            if (!isPartial && !isPdf) {
              // Malformed child under the dedicated root — remove.
              if (await deleteUriIdempotent(fileUri)) deleted += 1;
              continue;
            }
            const info = await FileSystem.getInfoAsync(fileUri);
            if (!info.exists) continue;
            const modified =
              "modificationTime" in info && typeof info.modificationTime === "number"
                ? info.modificationTime * (info.modificationTime < 1e12 ? 1000 : 1)
                : null;
            const ageMs = modified != null ? now - modified : Number.POSITIVE_INFINITY;
            if (isPartial || ageMs > maxAgeMs) {
              if (await deleteUriIdempotent(fileUri)) deleted += 1;
            }
          } catch {
            // Continue sweeping other entries.
          }
        }
        // Drop empty document directories.
        try {
          const remaining = await FileSystem.readDirectoryAsync(documentUri);
          if (remaining.length === 0) {
            await FileSystem.deleteAsync(documentUri, { idempotent: true });
          }
        } catch {
          // ignore
        }
      }
    }
    return { ok: true, deletedCountBucket: deletedCountBucket(deleted) };
  } catch {
    return { ok: false, reasonCode: "SWEEP_FAILED" };
  }
}

/** Safe DEV-only status line — never includes paths, IDs, or URLs. */
export function formatBodyScanCacheCleanupDevStatus(
  status: BodyScanOriginalCacheCleanupStatus,
): string {
  if (status.ok) return `body_scan_cache_cleanup ok bucket=${status.deletedCountBucket}`;
  return `body_scan_cache_cleanup fail reason=${status.reasonCode}`;
}

export type BodyScanCacheInventoryCounts = {
  readonly remainingFiles: number;
  readonly partialFiles: number;
};

/**
 * Count PDF/partial files under the dedicated root (optionally scoped).
 * Returns counts only — never paths.
 */
export async function countBodyScanCacheInventory(args?: {
  userId?: string;
  documentId?: string;
}): Promise<BodyScanCacheInventoryCounts> {
  let remainingFiles = 0;
  let partialFiles = 0;
  const root = getBodyScanOriginalCacheRootUri();
  if (!root) return { remainingFiles: 0, partialFiles: 0 };

  try {
    const rootInfo = await FileSystem.getInfoAsync(root);
    if (!rootInfo.exists) return { remainingFiles: 0, partialFiles: 0 };

    const accountFilter =
      args?.userId != null ? opaqueAccountScopeKey(args.userId) : null;
    const documentFilter =
      args?.documentId != null
        ? sanitizeBodyScanCacheSegment(args.documentId, "document_id")
        : null;

    const accounts = await FileSystem.readDirectoryAsync(root);
    for (const accountEntry of accounts) {
      if (accountEntry.includes("..") || accountEntry.includes("/")) continue;
      if (accountFilter != null && accountEntry !== accountFilter) continue;
      const accountUri = `${root}${accountEntry}/`;
      let documents: string[];
      try {
        documents = await FileSystem.readDirectoryAsync(accountUri);
      } catch {
        continue;
      }
      for (const documentEntry of documents) {
        if (documentEntry.includes("..") || documentEntry.includes("/")) continue;
        if (documentFilter != null && documentEntry !== documentFilter) continue;
        const documentUri = `${accountUri}${documentEntry}/`;
        let files: string[];
        try {
          files = await FileSystem.readDirectoryAsync(documentUri);
        } catch {
          continue;
        }
        for (const fileName of files) {
          if (fileName.includes("..") || fileName.includes("/")) continue;
          if (fileName.endsWith(".partial")) {
            partialFiles += 1;
            remainingFiles += 1;
          } else if (fileName.endsWith(".pdf")) {
            remainingFiles += 1;
          }
        }
      }
    }
  } catch {
    return { remainingFiles: 0, partialFiles: 0 };
  }
  return { remainingFiles, partialFiles };
}
