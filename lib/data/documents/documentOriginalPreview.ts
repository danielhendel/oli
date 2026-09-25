/**
 * View Original preview controller (pure).
 *
 * The server hands back a short-lived signed URL. The client downloads it into the app's
 * own protected cache and hands the *local* file to the system preview, so the bearer URL
 * never travels further than the download call.
 *
 * Nothing in this module returns, stores, or logs the URL or the local path — outcomes
 * carry status codes only.
 */

import type { DocumentViewOriginalResponseDto } from "@oli/contracts";

export type DocumentOriginalPreviewOutcome =
  | { status: "opened" }
  | { status: "unavailable"; reasonCode: string }
  | { status: "error"; code: "GRANT_FAILED" | "DOWNLOAD_FAILED" | "OPEN_FAILED" | "EXPIRED" };

export type DocumentOriginalPreviewEffects = {
  /** Ask the API for a grant. Returns null on transport/contract failure. */
  requestGrant: () => Promise<DocumentViewOriginalResponseDto | null>;
  /** Download into an app-private path. The caller must not expose the path. */
  downloadToProtectedPath: (args: {
    url: string;
    filename: string;
  }) => Promise<{ ok: true; localUri: string } | { ok: false }>;
  /** Hand the local file to the system preview. */
  openLocal: (localUri: string) => Promise<boolean>;
  now?: () => number;
};

export async function openDocumentOriginal(
  effects: DocumentOriginalPreviewEffects,
): Promise<DocumentOriginalPreviewOutcome> {
  const grant = await effects.requestGrant();
  if (!grant) return { status: "error", code: "GRANT_FAILED" };
  if (!grant.available) return { status: "unavailable", reasonCode: grant.reasonCode };

  const now = (effects.now ?? Date.now)();
  const expiresAtMs = Date.parse(grant.expiresAt);
  if (Number.isFinite(expiresAtMs) && expiresAtMs <= now) {
    return { status: "error", code: "EXPIRED" };
  }

  const downloaded = await effects.downloadToProtectedPath({
    url: grant.url,
    filename: grant.filename,
  });
  if (!downloaded.ok) return { status: "error", code: "DOWNLOAD_FAILED" };

  const opened = await effects.openLocal(downloaded.localUri);
  return opened ? { status: "opened" } : { status: "error", code: "OPEN_FAILED" };
}

/** Consumer copy for a preview outcome. Never surfaces a URL, path, or reason code. */
export function documentOriginalPreviewMessage(
  outcome: DocumentOriginalPreviewOutcome,
): string | null {
  switch (outcome.status) {
    case "opened":
      return null;
    case "unavailable":
      return outcome.reasonCode === "VIEW_ORIGINAL_NOT_STORED"
        ? "The original report is no longer stored."
        : "The original report can’t be opened right now.";
    case "error":
      return outcome.code === "EXPIRED"
        ? "That link expired. Try opening the report again."
        : "The original report can’t be opened right now.";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

/**
 * Local cache filename for a downloaded original. Deliberately derived from the document
 * id rather than the consumer filename so nothing report-identifying lands on disk.
 */
export function protectedOriginalCacheFilename(args: {
  documentId: string;
  mediaType: string;
}): string {
  const extension = args.mediaType === "application/pdf" ? "pdf" : "bin";
  const safeId = args.documentId.replace(/[^A-Za-z0-9_-]/g, "");
  return `original-${safeId}.${extension}`;
}
