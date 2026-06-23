// lib/labs/expoDocumentPicker.ts
// Lazy document picker access — never import expo-document-picker at module scope
// (requireNativeModule throws when ExpoDocumentPicker is not in the dev build).
import type { DocumentPickerResult } from "expo-document-picker";

export const DOCUMENT_PICKER_UNAVAILABLE_MESSAGE =
  "Labs Upload requires a new development build. Rebuild the app to enable PDF uploads.";

type DocumentPickerModule = typeof import("expo-document-picker");

/** undefined = not probed yet; null = import failed or API missing. */
let cachedModule: DocumentPickerModule | null | undefined;

async function loadExpoDocumentPicker(): Promise<DocumentPickerModule | null> {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    const mod = await import("expo-document-picker");
    if (typeof mod.getDocumentAsync !== "function") {
      cachedModule = null;
      return null;
    }
    cachedModule = mod;
    return mod;
  } catch {
    cachedModule = null;
    return null;
  }
}

/** Probe PDF picker support via safe dynamic import (no NativeModules checks). */
export async function probeExpoDocumentPickerAvailability(): Promise<boolean> {
  const mod = await loadExpoDocumentPicker();
  return mod != null;
}

export type PickLabPdfResult =
  | { status: "unavailable" }
  | { status: "canceled" }
  | { status: "picked"; asset: NonNullable<DocumentPickerResult["assets"]>[number] };

/** Pick a PDF via lazy-loaded expo-document-picker. */
export async function pickLabPdfDocument(): Promise<PickLabPdfResult> {
  const DocumentPicker = await loadExpoDocumentPicker();
  if (!DocumentPicker) {
    return { status: "unavailable" };
  }

  try {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled || !picked.assets?.[0]) {
      return { status: "canceled" };
    }

    return { status: "picked", asset: picked.assets[0] };
  } catch {
    return { status: "unavailable" };
  }
}

/** @internal Test helper — clears cached dynamic import result between cases. */
export function resetExpoDocumentPickerCacheForTests(): void {
  cachedModule = undefined;
}
