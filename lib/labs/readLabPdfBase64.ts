// lib/labs/readLabPdfBase64.ts
import * as FileSystem from "expo-file-system";

export async function readLocalUriAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}
