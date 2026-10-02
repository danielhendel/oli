/**
 * Opaque Body Scan list cursor — versioned, category-bound, no PHI.
 * Never log decoded cursor contents.
 */
import { bodyScanTypeSchema, type BodyScanType } from "@oli/contracts";

export const BODY_SCAN_LIST_CURSOR_VERSION = 1 as const;

export type BodyScanListCursorPayload = {
  v: typeof BODY_SCAN_LIST_CURSOR_VERSION;
  /** Last item id on the previous page (stable tie-break / startAfter). */
  id: string;
  /**
   * Query filter this cursor belongs to.
   * null = unfiltered list; a BodyScanType = category-filtered list.
   */
  scanType: BodyScanType | null;
};

export function encodeBodyScanListCursor(payload: BodyScanListCursorPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeBodyScanListCursor(cursor: string): BodyScanListCursorPayload | null {
  try {
    if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 512) return null;
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<BodyScanListCursorPayload>;
    if (parsed.v !== BODY_SCAN_LIST_CURSOR_VERSION) return null;
    if (typeof parsed.id !== "string" || parsed.id.length === 0 || parsed.id.length > 200) {
      return null;
    }
    let scanType: BodyScanType | null = null;
    if (parsed.scanType != null) {
      const typed = bodyScanTypeSchema.safeParse(parsed.scanType);
      if (!typed.success) return null;
      scanType = typed.data;
    }
    return { v: BODY_SCAN_LIST_CURSOR_VERSION, id: parsed.id, scanType };
  } catch {
    return null;
  }
}

/**
 * Reject cursors that were issued for a different scanType filter.
 */
export function bodyScanListCursorMatchesFilter(
  payload: BodyScanListCursorPayload,
  scanType: BodyScanType | undefined,
): boolean {
  const expected = scanType ?? null;
  return payload.scanType === expected;
}
