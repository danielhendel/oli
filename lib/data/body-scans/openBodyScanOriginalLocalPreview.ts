/**
 * Shared system-preview open helper for Body Scan originals.
 * Used by the production View Original hook and the DEV cache harness.
 *
 * Physical iOS note (B-3E-PREVIEW-OPEN-01):
 * `WebBrowser.openBrowserAsync` (SFSafariViewController) and `Linking.openURL` do not
 * reliably open app-private `file://` PDFs. When both fail, this helper returns a typed
 * `preview_method_unsupported` result — it does not invent a second viewer or add a
 * native dependency. A separate architecture decision is required (e.g. Quick Look or
 * an approved installed preview module).
 */

import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

export type BodyScanLocalPreviewMethod =
  | "web_browser"
  | "linking"
  | "system_preview"
  | "existing_secure_viewer";

export type BodyScanLocalPreviewSettlement = "dismissed" | "launch_only";

export type BodyScanLocalPreviewSafeReason =
  | "local_pdf_invalid"
  | "preview_method_unsupported"
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

function isProbablyLocalFileUri(uri: string): boolean {
  return typeof uri === "string" && (uri.startsWith("file:") || uri.startsWith("/"));
}

/**
 * Prefer WebBrowser (typically settles on dismiss) so callers can delete immediately.
 * Linking resolves at launch — callers must not claim close cleanup.
 *
 * Returns a typed result with fixed safe reason codes only (never URI/path/error text).
 */
export async function openBodyScanOriginalLocalPreview(
  localUri: string,
): Promise<BodyScanLocalPreviewResult> {
  if (typeof localUri !== "string" || localUri.length === 0) {
    return {
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: "local_pdf_invalid",
    };
  }

  let webBrowserFailed = false;
  try {
    await WebBrowser.openBrowserAsync(localUri);
    return {
      ok: true,
      opened: true,
      method: "web_browser",
      settlement: "dismissed",
      deleteImmediately: true,
    };
  } catch {
    webBrowserFailed = true;
  }

  try {
    const canOpen = await Linking.canOpenURL(localUri);
    if (canOpen) {
      await Linking.openURL(localUri);
      return {
        ok: true,
        opened: true,
        method: "linking",
        settlement: "launch_only",
        deleteImmediately: false,
      };
    }
  } catch {
    return {
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: webBrowserFailed ? "linking_open_failed" : "linking_open_failed",
      attemptedMethod: "linking",
    };
  }

  // Both installed, dependency-free APIs failed. On iOS local file:// this is expected
  // until an approved native preview path is selected.
  if (Platform.OS === "ios" && isProbablyLocalFileUri(localUri)) {
    return {
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: "preview_method_unsupported",
      attemptedMethod: webBrowserFailed ? "web_browser" : "linking",
    };
  }

  if (webBrowserFailed) {
    return {
      ok: false,
      opened: false,
      deleteImmediately: true,
      safeReasonCode: "web_browser_open_failed",
      attemptedMethod: "web_browser",
    };
  }

  return {
    ok: false,
    opened: false,
    deleteImmediately: true,
    safeReasonCode: "linking_open_failed",
    attemptedMethod: "linking",
  };
}
