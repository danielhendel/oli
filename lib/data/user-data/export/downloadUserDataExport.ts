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
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    return {
      ok: false,
      message: "Your export is ready, but the file could not be opened. Try again.",
      retryable: true,
    };
  }

  const extension = contentType.includes("zip") ? "zip" : "bin";
  // Safe local name: no email, UID, or request id.
  const target = `${baseDir}oli-data-export.${extension}`;

  try {
    // Replace any prior temp file so retries do not collide.
    await FileSystem.deleteAsync(target, { idempotent: true });

    const result = await FileSystem.downloadAsync(downloadUrl, target);
    if (result.status < 200 || result.status >= 300) {
      const mapped = mapExportDownloadError(`http_${result.status}`);
      return { ok: false, message: mapped.message, retryable: mapped.retryable };
    }

    const info = await FileSystem.getInfoAsync(result.uri);
    if (!info.exists || ("size" in info && typeof info.size === "number" && info.size <= 0)) {
      return {
        ok: false,
        message: "Your export is ready, but the file could not be opened. Try again.",
        retryable: true,
      };
    }

    await Share.share({
      url: result.uri,
      title: "Oli data export",
      message: "Your Oli data export",
    });

    // Best-effort cleanup after the share sheet returns.
    void FileSystem.deleteAsync(result.uri, { idempotent: true });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const mapped = mapExportDownloadError(msg);
    return { ok: false, message: mapped.message, retryable: mapped.retryable };
  }
}
