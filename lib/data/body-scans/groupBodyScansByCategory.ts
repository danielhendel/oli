/**
 * Pure Body Scan category grouping helpers.
 *
 * Landing/hub summaries must use category-scoped queries (see bodyScanCategorySummary).
 * This module retains date/history helpers and a pure grouper for offline/test use.
 * Exact counts are never derived from loaded pages in V1.
 */
import type { BodyScanListItemDto, BodyScanType } from "@oli/contracts";

import {
  BODY_SCAN_CATEGORY_DEFINITIONS,
  bodyScanCategoryDefinition,
  type BodyScanCategoryDefinition,
} from "./bodyScanCategoryCatalog";
import { bodyScanNavStatusLabel } from "./bodyScanNavStatusLabel";
import { normalizeBodyScanType } from "./normalizeBodyScanType";
import { formatLabSourceCalendarDate } from "@/lib/labs/labSourceDisplay";

function formatScanNavDate(iso: string): string {
  return formatLabSourceCalendarDate(iso) ?? "—";
}

/** Server list page maximum (not a history cap — use nextCursor/hasMore). */
export const BODY_SCAN_LIST_PAGE_MAX = 50;
export const BODY_SCAN_LIST_DEFAULT_LIMIT = 25;

export type BodyScanCategoryGroup = {
  readonly category: BodyScanCategoryDefinition;
  readonly hasScans: boolean;
  /** Always null in V1 — counts require an authoritative total. */
  readonly scanCount: null;
  readonly latest: BodyScanListItemDto | null;
  readonly supportingCopy: string;
  readonly accessibilityLabel: string;
};

export type GroupBodyScansByCategoryResult = {
  readonly groups: readonly BodyScanCategoryGroup[];
  /**
   * True only when the caller proved the input covers all scans.
   * Incomplete mixed pages must never claim per-category emptiness.
   */
  readonly listComplete: boolean;
};

function scanSortKey(item: BodyScanListItemDto): string {
  const primary = item.performedAt ?? item.uploadedAt;
  return `${primary}\0${item.id}`;
}

function compareNewestFirst(a: BodyScanListItemDto, b: BodyScanListItemDto): number {
  const ka = scanSortKey(a);
  const kb = scanSortKey(b);
  if (ka === kb) return 0;
  return ka < kb ? 1 : -1;
}

function formatLatestDate(item: BodyScanListItemDto): string {
  if (item.performedAt) return formatScanNavDate(item.performedAt);
  return formatScanNavDate(item.uploadedAt);
}

/**
 * Supporting copy for a known-complete nonempty latest item.
 * Counts are intentionally omitted in V1.
 */
export function buildBodyScanCategorySupportingCopy(args: {
  latest: BodyScanListItemDto | null;
  scanCount?: number | null;
  listComplete?: boolean;
}): string {
  if (!args.latest) {
    // Callers must only pass null latest when emptiness is proven complete.
    return "No scans yet";
  }
  const date = formatLatestDate(args.latest);
  const status = bodyScanNavStatusLabel(args.latest.status);
  return `Latest ${date} · ${status}`;
}

function buildAccessibilityLabel(args: {
  category: BodyScanCategoryDefinition;
  latest: BodyScanListItemDto | null;
}): string {
  if (!args.latest) return `${args.category.label}. No scans yet.`;
  const date = formatLatestDate(args.latest);
  const status = bodyScanNavStatusLabel(args.latest.status);
  return `${args.category.label}. Latest ${date}. ${status}.`;
}

/**
 * Group a proven-complete item set by category.
 *
 * WARNING: Do not pass a truncated mixed global page. Incomplete coverage must not
 * claim "No scans yet" for missing categories — use bodyScanCategorySummary instead.
 */
export function groupBodyScansByCategory(
  items: readonly BodyScanListItemDto[],
  opts?: { listComplete?: boolean },
): GroupBodyScansByCategoryResult {
  const listComplete = opts?.listComplete ?? false;

  const buckets = new Map<BodyScanType, BodyScanListItemDto[]>();
  for (const def of BODY_SCAN_CATEGORY_DEFINITIONS) {
    buckets.set(def.type, []);
  }

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const type = normalizeBodyScanType(item.scanType);
    const bucket = buckets.get(type) ?? buckets.get("other")!;
    bucket.push(item);
  }

  const groups: BodyScanCategoryGroup[] = BODY_SCAN_CATEGORY_DEFINITIONS.map((def) => {
    const bucket = buckets.get(def.type) ?? [];
    const sorted = [...bucket].sort(compareNewestFirst);
    const latest = sorted[0] ?? null;
    const category = bodyScanCategoryDefinition(def.type);

    // Incomplete coverage: never claim empty for categories absent from the page.
    if (!listComplete && latest == null) {
      return {
        category,
        hasScans: false,
        scanCount: null,
        latest: null,
        supportingCopy: "Unable to load",
        accessibilityLabel: `${category.label}. Unable to load.`,
      };
    }

    return {
      category,
      hasScans: latest != null,
      scanCount: null,
      latest,
      supportingCopy: buildBodyScanCategorySupportingCopy({ latest, listComplete }),
      accessibilityLabel: buildAccessibilityLabel({ category, latest }),
    };
  });

  return { groups, listComplete };
}

/**
 * Filter + sort scans for a category history page (newest first).
 * Prefer server-side scanType filter; this remains for pure unit use.
 */
export function selectBodyScansForCategory(
  items: readonly BodyScanListItemDto[],
  scanType: BodyScanType,
): BodyScanListItemDto[] {
  const target = normalizeBodyScanType(scanType);
  const filtered = items.filter((item) => normalizeBodyScanType(item.scanType) === target);
  return [...filtered].sort(compareNewestFirst);
}

/** Merge paginated history pages by stable scan id (first-seen wins). */
export function mergeBodyScanHistoryPages(
  pages: readonly (readonly BodyScanListItemDto[])[],
): BodyScanListItemDto[] {
  const seen = new Set<string>();
  const out: BodyScanListItemDto[] = [];
  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export function bodyScanHistoryDateLabel(item: BodyScanListItemDto): string {
  if (item.performedAt) return formatScanNavDate(item.performedAt);
  return `Uploaded ${formatScanNavDate(item.uploadedAt)}`;
}

export function bodyScanHistoryAccessibilityLabel(item: BodyScanListItemDto): string {
  const date = bodyScanHistoryDateLabel(item);
  const status = bodyScanNavStatusLabel(item.status);
  const device = item.deviceLabel ? `${item.deviceLabel}. ` : "";
  return `${date}. ${device}${status}.`;
}
