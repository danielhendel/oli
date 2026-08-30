/**
 * Removes downloaded export archives from app-private storage.
 */

import * as FileSystem from "expo-file-system";

export async function cleanupExportArchiveFiles(): Promise<void> {
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) return;

  for (const ext of ["zip", "bin"]) {
    const target = `${baseDir}oli-data-export.${ext}`;
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
  }
}
