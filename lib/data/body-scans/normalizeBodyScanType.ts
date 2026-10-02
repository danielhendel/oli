/**
 * Body Scan type normalization for category navigation.
 *
 * Only aliases with repository evidence are mapped. Unknown → other.
 * Does not rewrite stored records — presentation / grouping only (plus optional
 * preferredScanType ingest paths that already validate the governed enum).
 */
import { bodyScanTypeSchema, type BodyScanType } from "@oli/contracts";

/**
 * Evidence-backed aliases only:
 * - `dexa` → `dxa` (document type `dexa_report`, product DEXA/DXA synonym)
 * - `bodpod` → `bod_pod` (method/source taxonomy spelling)
 */
const BODY_SCAN_TYPE_ALIASES: Readonly<Record<string, BodyScanType>> = {
  dexa: "dxa",
  bodpod: "bod_pod",
};

/**
 * Normalize a raw type string into a governed Body Scan category.
 * Preserves already-governed enum values; maps known aliases; unknown → other.
 */
export function normalizeBodyScanType(raw: unknown): BodyScanType {
  if (typeof raw !== "string") return "other";
  const trimmed = raw.trim();
  if (!trimmed) return "other";

  const lower = trimmed.toLowerCase();
  const direct = bodyScanTypeSchema.safeParse(lower);
  if (direct.success) return direct.data;

  const aliased = BODY_SCAN_TYPE_ALIASES[lower];
  if (aliased) return aliased;

  // Underscore / hyphen variants of governed keys (e.g. "bod-pod").
  const collapsed = lower.replace(/-/g, "_");
  const collapsedParsed = bodyScanTypeSchema.safeParse(collapsed);
  if (collapsedParsed.success) return collapsedParsed.data;

  const collapsedAlias = BODY_SCAN_TYPE_ALIASES[collapsed.replace(/_/g, "")];
  if (collapsedAlias) return collapsedAlias;

  return "other";
}
