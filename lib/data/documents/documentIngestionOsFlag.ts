/**
 * Phase 3C — Document Ingestion OS feature flag.
 *
 * Controls new document-management UI only. Backend additive contracts remain available.
 *
 * Overrides:
 * - `process.env.EXPO_PUBLIC_DOCUMENT_INGESTION_OS_V1 === "0"` → disabled (Phase 3B Labs behavior)
 * - `process.env.EXPO_PUBLIC_DOCUMENT_INGESTION_OS_V1 === "1"` → enabled
 * - unset / any other string → enabled
 */

export const DOCUMENT_INGESTION_OS_V1_ENV_KEY = "EXPO_PUBLIC_DOCUMENT_INGESTION_OS_V1" as const;

export const DOCUMENT_INGESTION_OS_V1_FLAG_ID = "documentIngestionOsV1" as const;

let testOverride: boolean | null = null;

export function setDocumentIngestionOsV1EnabledForTests(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isDocumentIngestionOsV1Enabled(): boolean {
  if (testOverride != null) return testOverride;
  const override = process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY];
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}
