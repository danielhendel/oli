/**
 * Downloads a user data export to app-private storage and opens the share sheet.
 * Never logs download URLs or file contents.
 */

import * as FileSystem from "expo-file-system";
import { Share } from "react-native";

import { mapExportDownloadError } from "./mapExportError";

export type DownloadUserDataExportResult =
  | { ok: true }
  | { ok: false; message: string; retryable: boolean };

export async function downloadAndShareUserDataExport(args: {
  downloadUrl: string;
  contentType: string;
}): Promise<DownloadUserDataExportResult> {
  const { downloadUrl, contentType } = args;
  const extension = contentType.includes("zip") ? "zip" : "json";
  const target = `${FileSystem.cacheDirectory}oli-export-${Date.now()}.${extension}`;

  try {
    const result = await FileSystem.downloadAsync(downloadUrl, target);
    if (result.status !== 200) {
      const mapped = mapExportDownloadError(`http_${result.status}`);
      return { ok: false, message: mapped.message, retryable: mapped.retryable };
    }

    await Share.share({
      url: result.uri,
      title: "Oli data export",
      message: "Your Oli data export",
    });

    // Best-effort cleanup after share sheet closes.
    void FileSystem.deleteAsync(result.uri, { idempotent: true });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = mapExportDownloadError(msg);
    return { ok: false, message: mapped.message, retryable: mapped.retryable };
  }
}
