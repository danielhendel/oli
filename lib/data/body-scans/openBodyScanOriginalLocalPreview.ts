/**
 * Shared system-preview open helper for Body Scan originals.
 * Used by the production View Original hook and the DEV cache harness.
 */

import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import type { DocumentOriginalOpenLocalResult } from "@/lib/data/documents/documentOriginalPreview";

/**
 * Prefer WebBrowser (typically settles on dismiss) so callers can delete immediately.
 * Linking resolves at launch — callers must not claim close cleanup.
 */
export async function openBodyScanOriginalLocalPreview(
  localUri: string,
): Promise<DocumentOriginalOpenLocalResult> {
  try {
    await WebBrowser.openBrowserAsync(localUri);
    return { opened: true, deleteImmediately: true };
  } catch {
    // Fall through to Linking.
  }
  try {
    if (await Linking.canOpenURL(localUri)) {
      await Linking.openURL(localUri);
      return { opened: true, deleteImmediately: false };
    }
  } catch {
    // Fall through.
  }
  return { opened: false, deleteImmediately: true };
}
