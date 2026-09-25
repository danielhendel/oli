/**
 * View Original preview hook (client) — B-3E-CACHE-01 hardened.
 *
 * Wires the pure controller to Expo file/system-preview primitives and the
 * account-scoped Body Scan original cache. No new native PDF viewer dependency.
 *
 * Preview API semantics:
 * - Prefer `WebBrowser.openBrowserAsync` (typically settles when dismissed) → immediate delete.
 * - Fall back to `Linking.openURL` (settles at launch) → leave per-open file for stale sweep.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/lib/auth/AuthProvider";
import { viewDocumentOriginal } from "@/lib/api/documents";
import {
  deleteCachedBodyScanOriginal,
  downloadBodyScanOriginalToProtectedCache,
  sweepStaleBodyScanOriginalCaches,
} from "@/lib/data/body-scans/bodyScanOriginalCache";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import {
  documentOriginalPreviewMessage,
  openDocumentOriginal,
  type DocumentOriginalPreviewOutcome,
} from "@/lib/data/documents/documentOriginalPreview";

export type DocumentOriginalPreviewState = {
  busy: boolean;
  message: string | null;
};

export function useDocumentOriginalPreview(documentId: string | null) {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<DocumentOriginalPreviewState>({ busy: false, message: null });
  const lastLocalUriRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Bounded stale sweep before the first open in this mount (and when document changes).
    void sweepStaleBodyScanOriginalCaches();
    return () => {
      mountedRef.current = false;
      lastLocalUriRef.current = null;
    };
  }, [documentId]);

  const open = useCallback(async (): Promise<DocumentOriginalPreviewOutcome | null> => {
    if (!documentId || !user?.uid) return null;
    setState({ busy: true, message: null });

    // Sweep orphans from abnormal termination before allocating a new preview path.
    await sweepStaleBodyScanOriginalCaches();

    const userId = user.uid;
    const outcome = await openDocumentOriginal({
      requestGrant: async () => {
        const token = await getIdToken(false);
        if (!token) return null;
        const res = await viewDocumentOriginal(token, documentId, {
          cacheBust: `view-original-${Date.now()}`,
        });
        const parsed = truthOutcomeFromApiResult(res);
        return parsed.status === "ready" ? parsed.data : null;
      },
      downloadToProtectedPath: async ({ url }) => {
        const downloaded = await downloadBodyScanOriginalToProtectedCache({
          userId,
          documentId,
          url,
        });
        if (!downloaded.ok) return { ok: false };
        lastLocalUriRef.current = downloaded.localUri;
        return { ok: true, localUri: downloaded.localUri };
      },
      openLocal: async (localUri) => {
        // Prefer the API that settles when the viewer is dismissed.
        try {
          await WebBrowser.openBrowserAsync(localUri);
          return { opened: true, deleteImmediately: true };
        } catch {
          // Fall through to Linking.
        }
        try {
          if (await Linking.canOpenURL(localUri)) {
            await Linking.openURL(localUri);
            // Resolves at launch — do not claim close cleanup; stale sweep covers orphans.
            return { opened: true, deleteImmediately: false };
          }
        } catch {
          // Fall through.
        }
        return { opened: false, deleteImmediately: true };
      },
      deleteLocal: async (localUri) => {
        await deleteCachedBodyScanOriginal(localUri);
        if (lastLocalUriRef.current === localUri) {
          lastLocalUriRef.current = null;
        }
      },
    });

    if (mountedRef.current) {
      setState({ busy: false, message: documentOriginalPreviewMessage(outcome) });
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
