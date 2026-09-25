/**
 * View Original preview hook (client).
 *
 * Wires the pure controller to Expo file/system-preview primitives. No new native PDF
 * viewer dependency: the downloaded file is handed to the OS.
 */

import { useCallback, useState } from "react";
import { Linking } from "react-native";
import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/lib/auth/AuthProvider";
import { viewDocumentOriginal } from "@/lib/api/documents";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import {
  documentOriginalPreviewMessage,
  openDocumentOriginal,
  protectedOriginalCacheFilename,
  type DocumentOriginalPreviewOutcome,
} from "@/lib/data/documents/documentOriginalPreview";

export type DocumentOriginalPreviewState = {
  busy: boolean;
  message: string | null;
};

export function useDocumentOriginalPreview(documentId: string | null) {
  const { getIdToken } = useAuth();
  const [state, setState] = useState<DocumentOriginalPreviewState>({ busy: false, message: null });

  const open = useCallback(async (): Promise<DocumentOriginalPreviewOutcome | null> => {
    if (!documentId) return null;
    setState({ busy: true, message: null });

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
        const directory = FileSystem.cacheDirectory;
        if (!directory) return { ok: false };
        const localUri =
          directory + protectedOriginalCacheFilename({ documentId, mediaType: "application/pdf" });
        try {
          const result = await FileSystem.downloadAsync(url, localUri);
          if (result.status !== 200) return { ok: false };
          return { ok: true, localUri: result.uri };
        } catch {
          return { ok: false };
        }
      },
      openLocal: async (localUri) => {
        try {
          if (await Linking.canOpenURL(localUri)) {
            await Linking.openURL(localUri);
            return true;
          }
        } catch {
          // Fall through to the in-app system preview.
        }
        try {
          await WebBrowser.openBrowserAsync(localUri);
          return true;
        } catch {
          return false;
        }
      },
    });

    setState({ busy: false, message: documentOriginalPreviewMessage(outcome) });
    return outcome;
  }, [documentId, getIdToken]);

  const clearMessage = useCallback(() => setState((prev) => ({ ...prev, message: null })), []);

  return { ...state, open, clearMessage };
}
